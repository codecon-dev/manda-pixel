import { isValidPublicAdId } from './ad-rules.ts';
import type { Advertiser, AdvertiserSource, LiveAdRef } from '../../types/advertisers.ts';

/** Limite do nome do anunciante na lista, no titulo e no h1 de /a/[id]. */
export const ADVERTISER_NAME_MAX = 80;
/** Quantos anunciantes a home lista no HTML do servidor. */
export const HOME_ADVERTISERS_LIMIT = 30;

/** Nome publico: altText aparado e cortado; sem altText, "Anúncio #N". */
export function advertiserName(altText: string | null | undefined, number: number): string {
  const name = (altText ?? '').trim().slice(0, ADVERTISER_NAME_MAX).trim();
  return name || `Anúncio #${number}`;
}

/** Hostname do link sem "www."; link invalido vira ''. */
export function advertiserDomain(linkUrl: string | null | undefined): string {
  if (!linkUrl) return '';
  try {
    const url = new URL(linkUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return url.hostname.replace(/^www\./, '');
  } catch {
    // URL invalida: sem dominio, o anunciante continua na lista.
    return '';
  }
}

/** Numero de cada anuncio no ar: ordem por COALESCE(paid_at, '') e order_id, como getPublicAdById. */
function liveNumbers(live: readonly LiveAdRef[]): Map<string, number> {
  const sorted = [...live].sort((a, b) => {
    const pa = a.paidAt ?? '';
    const pb = b.paidAt ?? '';
    if (pa !== pb) return pa < pb ? -1 : 1;
    if (a.orderId === b.orderId) return 0;
    return a.orderId < b.orderId ? -1 : 1;
  });
  return new Map(sorted.map((ad, i) => [ad.orderId, i + 1]));
}

/**
 * Lista publica de anunciantes a partir dos blocos de getGridState().
 * So entra bloco published, no ar e com id publico valido (o link /a/[id] precisa abrir).
 */
export function buildAdvertiserList(
  blocks: readonly AdvertiserSource[],
  live: readonly LiveAdRef[],
): Advertiser[] {
  const numbers = liveNumbers(live);
  const list: Advertiser[] = [];
  for (const block of blocks) {
    if (block.state !== 'published' || !isValidPublicAdId(block.id)) continue;
    const number = block.number ?? numbers.get(block.id);
    if (number === undefined) continue;
    list.push({
      id: block.id,
      number,
      name: advertiserName(block.altText, number),
      domain: advertiserDomain(block.linkUrl),
      href: `/a/${block.id}`,
    });
  }
  return list.sort((a, b) => a.number - b.number);
}
