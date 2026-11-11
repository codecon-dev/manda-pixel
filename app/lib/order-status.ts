import { getAdByOrderId } from './db.ts';
import { isValidPublicAdId } from './ad-rules.ts';
import { applyGatewayOrder, gatewayOrderUrl } from './gateway-sync.ts';
import type { GatewayOrder, OrderStatusResult } from '../../types/orders.ts';

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

const GATEWAY_STATUSES: ReadonlySet<string> = new Set(['pending', 'paid', 'expired', 'refunded']);

function localFallback(orderId: string): OrderStatusResult {
  const localAd = getAdByOrderId(orderId);
  if (!localAd) {
    return { httpStatus: 502, body: { error: 'Pedido não encontrado e gateway inacessível.' } };
  }
  const status: GatewayOrder['status'] =
    localAd.status === 'paid' || localAd.status === 'expired' ? localAd.status : 'pending';
  return {
    httpStatus: 200,
    body: {
      order: {
        orderId,
        pixels: localAd.pixels,
        value: localAd.pixels,
        status,
        createdAt: localAd.created_at,
        expiresAt: localAd.expires_at || undefined,
      },
      ad: localAd,
    },
  };
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
      return { httpStatus: 404, body: { error: 'Pedido não encontrado no gateway.' } };
    }
    return { httpStatus: gatewayRes.status, body: { error: 'Falha ao consultar gateway.' } };
  }

  const gatewayOrder = (await gatewayRes.json()) as GatewayOrder;
  if (!GATEWAY_STATUSES.has(gatewayOrder?.status)) {
    return { httpStatus: 502, body: { error: 'Resposta inválida do gateway.' } };
  }
  const ad = applyGatewayOrder(orderId, gatewayOrder);
  return { httpStatus: 200, body: { order: gatewayOrder, ad } };
}
