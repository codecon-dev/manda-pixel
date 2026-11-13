/** Acima desta fracao de pixels opacos na mesma faixa de cor, a imagem e tratada como "quase vazia". */
export const BLANK_IMAGE_THRESHOLD = 0.95;

const RGBA_STRIDE = 4;
const QUANT_SHIFT = 4; // faixas de 16 por canal
const KEY_COUNT = 1 << (3 * (8 - QUANT_SHIFT));

/**
 * Fracao dos pixels opacos que caem na cor (quantizada) mais frequente.
 * Ignora pixel com alfa 0. Imagem sem pixel opaco devolve 1.
 * Funcao pura: roda no navegador (ImageData) e no servidor (PNG decodificado).
 */
export function dominantColorRatio(rgba: Uint8Array | Uint8ClampedArray): number {
  const counts = new Uint32Array(KEY_COUNT);
  let opaque = 0;
  let best = 0;
  for (let i = 0; i + 3 < rgba.length; i += RGBA_STRIDE) {
    if (rgba[i + 3] === 0) continue;
    const key = ((rgba[i] >> QUANT_SHIFT) << 8) | ((rgba[i + 1] >> QUANT_SHIFT) << 4) | (rgba[i + 2] >> QUANT_SHIFT);
    const n = ++counts[key];
    if (n > best) best = n;
    opaque++;
  }
  return opaque === 0 ? 1 : best / opaque;
}
