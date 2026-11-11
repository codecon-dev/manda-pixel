import {
  BLOCK_SIZE,
  CANVAS_MAX_BACKING_PIXELS,
  CANVAS_MAX_DPR,
  FINE_GRID_MIN_ZOOM,
  MIN_GRID_SPACING_PX,
} from './constants.ts';

// Chave de hover: célula encaixada {x, y} ou bloco ocupado {id}
export type CellKey = { x: number; y: number } | { id: string };

/** Densidade do backing store: até 2x, limitada a ~2 milhões de pixels e nunca abaixo de 1. */
export function computeCanvasDpr(width: number, height: number, devicePixelRatio?: number): number {
  const deviceDpr = devicePixelRatio && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const area = width * height;
  const areaLimit = area > 0 ? Math.sqrt(CANVAS_MAX_BACKING_PIXELS / area) : CANVAS_MAX_DPR;
  return Math.max(1, Math.min(deviceDpr, CANVAS_MAX_DPR, areaLimit));
}

/** Linhas de 5 px só quando o zoom pede e o espaçamento na tela não vira borrão. */
export function shouldDrawFineGrid(zoom: number): boolean {
  return zoom >= FINE_GRID_MIN_ZOOM && BLOCK_SIZE * zoom >= MIN_GRID_SPACING_PX;
}

/** true quando o hover mudou de célula ou de bloco (null = fora de tudo). */
export function cellChanged(prev: CellKey | null, next: CellKey | null): boolean {
  if (prev === null || next === null) return prev !== next;
  if ('id' in prev || 'id' in next) {
    return !('id' in prev && 'id' in next && prev.id === next.id);
  }
  return prev.x !== next.x || prev.y !== next.y;
}
