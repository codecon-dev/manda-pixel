import { getDb, syncOrderStatusWithGateway, type AdRecord } from './db.ts';
import type { GatewayOrder } from '../../types/orders.ts';

let lastSyncTime = 0;
const SYNC_THROTTLE_MS = 10000;

export async function syncGatewayOrders(force = false): Promise<number> {
  const now = Date.now();
  if (!force && now - lastSyncTime < SYNC_THROTTLE_MS) {
    return 0;
  }
  lastSyncTime = now;

  const gatewayUrl = process.env.GATEWAY_URL || 'http://gateway:8000';
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
      if (!order.orderId) continue;
      const updated = syncOrderStatusWithGateway(order.orderId, {
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

  const gatewayUrl = process.env.GATEWAY_URL || 'http://gateway:8000';
  let synced = 0;

  for (const row of pendingAds) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    try {
      const res = await fetch(`${gatewayUrl}/orders/${row.order_id}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const gwOrder: GatewayOrder = await res.json();
        syncOrderStatusWithGateway(row.order_id, gwOrder);
        synced++;
      }
    } catch {
      clearTimeout(timeoutId);
      break;
    }
  }

  return synced;
}
