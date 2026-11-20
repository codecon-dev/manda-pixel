import { getGridState, listLiveAdRefs } from './db.ts';
import { buildAdvertiserList } from './advertisers.ts';
import type { Advertiser } from '../../types/advertisers.ts';

/** Anunciantes no ar, lidos do banco no servidor. Pode lancar se o banco falhar. */
export function loadAdvertisers(): Advertiser[] {
  return buildAdvertiserList(getGridState().blocks, listLiveAdRefs());
}
