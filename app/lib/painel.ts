import { getDb } from './db.ts';
import { GOAL_BRL, PIXEL_PRICE_BRL, TOTAL_PIXELS } from './constants.ts';
import type { PainelAdRow, PainelStats } from '../../types/painel.ts';

/** Status de anuncio cujo pagamento entrou e continua valendo. */
const PAID_STATUSES: ReadonlySet<string> = new Set(['paid', 'published', 'in_review']);
/** Status de moderacao que tiram o anuncio da conta (recusado ou estornado). */
const EXCLUDED_MODERATION: ReadonlySet<string> = new Set(['rejected', 'refunded']);
/** Status que deixam o anuncio visivel na grade. */
const LIVE_STATUSES: ReadonlySet<string> = new Set(['paid', 'published']);

export function isPaidRow(row: PainelAdRow): boolean {
  return PAID_STATUSES.has(row.status) && !EXCLUDED_MODERATION.has(row.moderation_status);
}

export function isLiveRow(row: PainelAdRow): boolean {
  return LIVE_STATUSES.has(row.status) && row.moderation_status === 'approved';
}

/** Calculo puro, sem banco: soma pixels pagos, receita, % da grade e anuncios no ar. */
export function computeStats(rows: readonly PainelAdRow[]): PainelStats {
  let soldPixels = 0;
  let liveAds = 0;
  for (const row of rows) {
    if (!isPaidRow(row)) continue;
    soldPixels += row.pixels;
    if (isLiveRow(row)) liveAds += 1;
  }
  return {
    soldPixels,
    pct: (soldPixels / TOTAL_PIXELS) * 100,
    revenueBRL: soldPixels * PIXEL_PRICE_BRL,
    liveAds,
    goalBRL: GOAL_BRL,
  };
}

export function getPainelStats(): PainelStats {
  const rows = getDb()
    .prepare(
      `SELECT pixels, status, moderation_status FROM ads
       WHERE status IN ('paid', 'published', 'in_review')
         AND moderation_status NOT IN ('rejected', 'refunded')`
    )
    .all() as unknown as PainelAdRow[];
  return computeStats(rows);
}
