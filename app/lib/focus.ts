import { GRID_MAX_COORD } from './constants.ts';
import type { GridFocus } from '../../types/ads.ts';

type QueryValue = string | string[] | undefined;

function parseCoord(value: QueryValue): number | null {
  if (typeof value !== 'string' || !/^\d{1,3}$/.test(value)) return null;
  const n = Number(value);
  return n >= 0 && n <= GRID_MAX_COORD ? n : null;
}

/** Le ?x=&y= da home. So aceita inteiros 0-999; qualquer outra coisa = sem foco. */
export function parseFocus(x: QueryValue, y: QueryValue): GridFocus | undefined {
  const fx = parseCoord(x);
  const fy = parseCoord(y);
  if (fx === null || fy === null) return undefined;
  return { x: fx, y: fy };
}
