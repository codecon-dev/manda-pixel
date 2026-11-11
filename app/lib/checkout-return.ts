import type { CheckoutRetornoResultado } from './analytics.ts';
import type { GatewayOrder } from '../../types/orders.ts';

export interface CheckoutReturnNotice {
  resultado: CheckoutRetornoResultado;
  title: string;
  message: string;
}

const NOTICES: Record<GatewayOrder['status'], CheckoutReturnNotice> = {
  paid: {
    resultado: 'sucesso',
    title: 'Pagamento confirmado',
    message: 'Recebemos o pagamento. O anúncio entra na grade assim que for publicado.',
  },
  pending: {
    resultado: 'pendente',
    title: 'Pagamento pendente',
    message: 'O pagamento ainda não foi confirmado. A área continua reservada até o fim do prazo.',
  },
  expired: {
    resultado: 'expirado',
    title: 'Reserva expirada',
    message: 'A reserva expirou sem pagamento. A área voltou a ficar livre na grade.',
  },
  refunded: {
    resultado: 'estornado',
    title: 'Pedido estornado',
    message: 'Este pedido foi estornado.',
  },
};

export const CHECKOUT_RETURN_ERROR = {
  title: 'Não deu para consultar o pedido',
  message: 'Recarregue a página em alguns instantes para ver o status.',
} as const;

/** Aviso do retorno do checkout a partir do status lido no gateway; null se o status for desconhecido. */
export function checkoutReturnNotice(status: unknown): CheckoutReturnNotice | null {
  if (typeof status !== 'string' || !Object.hasOwn(NOTICES, status)) return null;
  return NOTICES[status as GatewayOrder['status']];
}
