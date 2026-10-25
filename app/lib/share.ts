import { SITE_URL } from './constants.ts';
import type { ShareUrlInput, ShareVariant } from '../../types/share.ts';

/** Endpoint de post do X (intent web, abre o compositor com texto e link). */
export const X_INTENT_URL = 'https://x.com/intent/post';

/** Status de pedido em que o comprador já pode divulgar o anúncio. */
export const SHAREABLE_ORDER_STATUSES: ReadonlySet<string> = new Set(['paid', 'published', 'in_review']);

/** Texto do post. Só número de pixels: nunca nome, contato, link de destino ou texto do anúncio. */
export function shareText(variant: ShareVariant, pixels: number): string {
  if (variant === 'comprador') {
    const count = Math.max(0, Math.floor(pixels)).toLocaleString('pt-BR');
    return `Meu anúncio está no Manda Pixel: ${count} pixels no mural de 1 milhão, no ar pra sempre`;
  }
  return 'Olha esse anúncio no Manda Pixel, o mural de 1 milhão de pixels';
}

/** URL de intent do X apontando para a página pública do anúncio (/a/{id}). */
export function buildShareUrl({ adId, pixels, variant }: ShareUrlInput): string {
  const adUrl = `${SITE_URL}/a/${encodeURIComponent(adId)}`;
  const text = shareText(variant, pixels);
  return `${X_INTENT_URL}?text=${encodeURIComponent(text)}&url=${encodeURIComponent(adUrl)}`;
}
