/** Contagem de cliques nos anuncios (rota /r/[id]). Nao guarda IP, cookie nem dado de quem clicou. */
import { getDb } from './db.ts';
import { LIVE_AD_SQL, isValidPublicAdId } from './ad-rules.ts';
import { safeHttpUrl } from './safe-url.ts';
import type { AdRedirectResult } from '../../types/ads.ts';

/** User-agents de robos e previews de link: abrem a URL mas nao sao clique de gente. */
export const BOT_USER_AGENT_PATTERN = /bot|crawl|spider|preview|facebookexternalhit|slurp|headless/i;

export function isBotUserAgent(userAgent: string | null): boolean {
  return userAgent !== null && BOT_USER_AGENT_PATTERN.test(userAgent);
}

/** Link gravado do anuncio no ar, ou null se o id for invalido, inexistente ou fora do ar. */
export function getLiveAdLink(id: string): string | null {
  if (typeof id !== 'string' || !isValidPublicAdId(id)) return null;
  const row = getDb()
    .prepare(`SELECT link_url FROM ads WHERE order_id = ? AND ${LIVE_AD_SQL}`)
    .get(id) as { link_url: string | null } | undefined;
  return row?.link_url ?? null;
}

/** Soma 1 clique, so em anuncio no ar. */
export function incrementAdClicks(id: string): void {
  if (!isValidPublicAdId(id)) return;
  getDb().prepare(`UPDATE ads SET clicks = clicks + 1 WHERE order_id = ? AND ${LIVE_AD_SQL}`).run(id);
}

/** Total de cliques dos anuncios no ar. */
export function getTotalClicks(): number {
  const row = getDb()
    .prepare(`SELECT COALESCE(SUM(clicks), 0) AS total FROM ads WHERE ${LIVE_AD_SQL}`)
    .get() as { total: number };
  return Number(row.total);
}

/** Decide o redirect: destino sempre o link do banco, nunca algo vindo da requisicao. */
export function resolveAdRedirect(id: string, userAgent: string | null): AdRedirectResult {
  const link = safeHttpUrl(getLiveAdLink(id));
  if (!link) return { status: 404 };
  if (!isBotUserAgent(userAgent)) incrementAdClicks(id);
  return { status: 302, location: link.toString() };
}
