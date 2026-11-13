import { decodePng, UnsupportedPngError } from './png-upscale.ts';
import { dominantColorRatio } from './dominant-color.ts';

/**
 * Metrica de "imagem quase de uma cor so" para o PNG final do pedido.
 * Formato que o decoder nao suporta (ex.: paleta) ou PNG corrompido devolve null: nunca derruba o pedido.
 */
export function pngDominantRatio(png: Buffer): number | null {
  try {
    return dominantColorRatio(decodePng(png).rgba);
  } catch (err) {
    if (!(err instanceof UnsupportedPngError)) {
      console.error('[pngDominantRatio] falha ao decodificar PNG:', err instanceof Error ? err.message : 'erro desconhecido');
    }
    return null;
  }
}
