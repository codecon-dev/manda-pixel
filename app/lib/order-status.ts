import { getAdByOrderId } from './db.ts';
import { isValidPublicAdId } from './ad-rules.ts';
import { applyGatewayOrder, gatewayOrderUrl } from './gateway-sync.ts';
import type { GatewayOrder, OrderStatusResult, PublicAd, PublicOrder } from '../../types/orders.ts';

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

const GATEWAY_STATUSES: ReadonlySet<string> = new Set(['pending', 'paid', 'expired', 'refunded']);

type RawRecord = Readonly<Record<string, unknown>>;

function ownField(raw: RawRecord, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(raw, key) ? raw[key] : undefined;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Whitelist do pedido devolvido ao navegador. checkoutUrl so enquanto o pedido esta pendente. */
export function toPublicOrder(raw: RawRecord): PublicOrder {
  const status = ownField(raw, 'status') as GatewayOrder['status'];
  const order: PublicOrder = {
    orderId: String(ownField(raw, 'orderId') ?? ''),
    status,
    pixels: finiteNumber(ownField(raw, 'pixels')),
  };
  const checkoutUrl = ownField(raw, 'checkoutUrl');
  if (status === 'pending' && typeof checkoutUrl === 'string') {
    order.checkoutUrl = checkoutUrl;
  }
  return order;
}

/** Whitelist do anuncio devolvido ao navegador: nada de visitor_id, medida de moderacao ou datas internas. */
export function toPublicAd(row: RawRecord | null | undefined): PublicAd | null {
  if (!row) return null;
  return {
    status: String(ownField(row, 'status') ?? ''),
    moderation_status: String(ownField(row, 'moderation_status') ?? ''),
    moderation_decision: optionalString(ownField(row, 'moderation_decision')),
    image_path: optionalString(ownField(row, 'image_path')),
    alt_text: optionalString(ownField(row, 'alt_text')),
    x: finiteNumber(ownField(row, 'x')),
    y: finiteNumber(ownField(row, 'y')),
    w: finiteNumber(ownField(row, 'w')),
    h: finiteNumber(ownField(row, 'h')),
    link_url: optionalString(ownField(row, 'link_url')),
  };
}

function localFallback(orderId: string): OrderStatusResult {
  const localAd = getAdByOrderId(orderId);
  if (!localAd) {
    return { httpStatus: 502, body: { error: 'Pedido não encontrado.' } };
  }
  const status: GatewayOrder['status'] =
    localAd.status === 'paid' || localAd.status === 'expired' ? localAd.status : 'pending';
  const order = toPublicOrder({ orderId, pixels: localAd.pixels, status, checkoutUrl: localAd.checkout_url });
  return { httpStatus: 200, body: { order, ad: toPublicAd(localAd as unknown as RawRecord) } };
}

/** Le o pedido no gateway e sincroniza o banco. So leitura: nao forca nenhum status. */
export async function readOrderStatus(orderId: unknown, fetchFn: FetchFn = fetch): Promise<OrderStatusResult> {
  if (typeof orderId !== 'string' || !isValidPublicAdId(orderId)) {
    return { httpStatus: 400, body: { error: 'orderId inválido' } };
  }

  let gatewayRes: Response;
  try {
    gatewayRes = await fetchFn(gatewayOrderUrl(orderId), { cache: 'no-store' });
  } catch (err) {
    console.error('[orders/status] gateway inacessível', { orderId, err: String(err) });
    return localFallback(orderId);
  }

  if (!gatewayRes.ok) {
    if (gatewayRes.status === 404) {
      return { httpStatus: 404, body: { error: 'Pedido não encontrado.' } };
    }
    return { httpStatus: gatewayRes.status, body: { error: 'Falha ao consultar o pagamento.' } };
  }

  const gatewayOrder = (await gatewayRes.json()) as GatewayOrder;
  if (!GATEWAY_STATUSES.has(gatewayOrder?.status)) {
    return { httpStatus: 502, body: { error: 'Resposta inválida do sistema de pagamento.' } };
  }
  const ad = applyGatewayOrder(orderId, gatewayOrder);
  return {
    httpStatus: 200,
    body: { order: toPublicOrder(gatewayOrder as unknown as RawRecord), ad: toPublicAd(ad as unknown as RawRecord) },
  };
}
