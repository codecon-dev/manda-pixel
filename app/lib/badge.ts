import { SITE_URL } from './constants.ts';

export const BADGE_PATH = '/selo-mandapixel.svg';
export const BADGE_ALT = 'Estou no Manda Pixel';
export const BADGE_WIDTH = 180;
export const BADGE_HEIGHT = 40;
export const BADGE_REF = 'selo';

/** URL absoluta da imagem do selo. */
export function badgeImageUrl(): string {
  return `${SITE_URL}${BADGE_PATH}`;
}

/** URL da pagina publica do anuncio, marcada com ref=selo. */
export function badgeLinkUrl(adId: string): string {
  return `${SITE_URL}/a/${encodeURIComponent(adId)}?ref=${BADGE_REF}`;
}

/** HTML pronto para colar no site de quem anunciou. So usa o id publico do anuncio. */
export function buildBadgeHtml(adId: string): string {
  return (
    `<a href="${badgeLinkUrl(adId)}" target="_blank" rel="noopener">` +
    `<img src="${badgeImageUrl()}" alt="${BADGE_ALT}" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}">` +
    `</a>`
  );
}
