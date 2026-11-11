// Limites de pedido. Funcoes puras: usadas no cliente (PixelCanvas, BuyPanel) e na API.

export const MAX_ORDER_PIXELS = 50000;

export const ORDER_LIMIT_MSG = 'por enquanto cada pedido vai até 50.000 pixels. pra mais, faz em partes';

/** true se a area w x h passa do teto por pedido. */
export function exceedsOrderLimit(w: number, h: number): boolean {
  return w * h > MAX_ORDER_PIXELS;
}

type HeaderReader = { get(name: string): string | null };

/** IP do visitante: primeiro valor de x-forwarded-for, senao x-real-ip, senao string vazia. */
export function getClientIp(headers: HeaderReader): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const real = headers.get('x-real-ip');
  return real ? real.trim() : '';
}
