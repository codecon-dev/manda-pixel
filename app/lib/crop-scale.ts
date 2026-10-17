import { CROP_MAX_SCALE, CROP_MAX_SIDE } from './constants.ts';

/** Fator de ampliação do recorte: px de imagem por pixel do bloco (1..20, lado máx 1000). */
export function cropScale(tw: number, th: number): number {
  return Math.max(1, Math.min(CROP_MAX_SCALE, Math.floor(CROP_MAX_SIDE / Math.max(tw, th))));
}
