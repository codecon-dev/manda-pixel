import { getDb, syncOrderStatusWithGateway, type AdRecord } from './db.ts';
import { isValidPublicAdId } from './ad-rules.ts';
import { removeExpiredAdUpload, sweepExpiredAdUploads } from './ad-image.ts';
import type { GatewayOrder } from '../../types/orders.ts';

let lastSyncTime = 0;
const SYNC_THROTTLE_MS = 10000;
const DEFAULT_GATEWAY_URL = 'http://gateway:8000';

export class InvalidOrderIdError extends Error {
  constructor() {
    super('orderId inválido');
    this.name = 'InvalidOrderIdError';
  }
}

export function gatewayBaseUrl(): string {
  return process.env.GATEWAY_URL || DEFAULT_GATEWAY_URL;
}

/** URL do pedido no gateway. Lanca InvalidOrderIdError para id fora do formato publico. */
export function gatewayOrderUrl(orderId: string, baseUrl = gatewayBaseUrl()): string {
  if (typeof orderId !== 'string' || !isValidPublicAdId(orderId)) throw new InvalidOrderIdError();
  return `${baseUrl}/orders/${encodeURIComponent(orderId)}`;
}

/** Aplica o status do gateway ao pedido local e remove a imagem se ele expirou. */
export function applyGatewayOrder(
  orderId: string,
  order: { status: string; paidAt?: string; expiresAt?: string }
): AdRecord | null {
  if (!isValidPublicAdId(orderId)) throw new InvalidOrderIdError();
  const updated = syncOrderStatusWithGateway(orderId, order);
  if (updated?.status === 'expired') removeExpiredAdUpload(orderId);
  return updated;
}

export async function syncGatewayOrders(force = false): Promise<number> {
  const now = Date.now();
  if (!force && now - lastSyncTime < SYNC_THROTTLE_MS) {
    return 0;
  }
  lastSyncTime = now;
  sweepExpiredAdUploads();

  const gatewayUrl = gatewayBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch(`${gatewayUrl}/orders?limit=200`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return 0;
    const orders: GatewayOrder[] = await res.json();
    if (!Array.isArray(orders)) return 0;

    let updatedCount = 0;
    for (const order of orders) {
      if (typeof order.orderId !== 'string' || !isValidPublicAdId(order.orderId)) continue;
      const updated = applyGatewayOrder(order.orderId, {
        status: order.status,
        paidAt: order.paidAt,
        expiresAt: order.expiresAt,
      });
      if (updated) updatedCount++;
    }

    return updatedCount;
  } catch {
    clearTimeout(timeoutId);
    return 0;
  }
}

export async function syncPendingLocalOrders(): Promise<number> {
  const db = getDb();
  const pendingAds = db.prepare(`
    SELECT order_id FROM ads
    WHERE status IN ('pending', 'reserved')
    ORDER BY created_at DESC
    LIMIT 50
  `).all() as unknown as { order_id: string }[];

  if (pendingAds.length === 0) return 0;

  let synced = 0;

  for (const row of pendingAds) {
    if (!isValidPublicAdId(row.order_id)) continue;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    try {
      const res = await fetch(gatewayOrderUrl(row.order_id), {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const gwOrder: GatewayOrder = await res.json();
        applyGatewayOrder(row.order_id, gwOrder);
        synced++;
      }
    } catch {
      clearTimeout(timeoutId);
      break;
    }
  }

  return synced;
}
