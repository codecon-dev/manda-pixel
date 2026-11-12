// Limites de pedido. Funcoes puras: usadas no cliente (PixelCanvas, BuyPanel) e na API.

export const MAX_ORDER_PIXELS = 50000;

export const ORDER_LIMIT_MSG = 'por enquanto cada pedido vai até 50.000 pixels. pra mais, faz em partes';

/** true se a area w x h passa do teto por pedido. */
export function exceedsOrderLimit(w: number, h: number): boolean {
  return w * h > MAX_ORDER_PIXELS;
}
