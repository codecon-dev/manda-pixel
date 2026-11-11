import { FINE_GRID_MIN_ZOOM, GRID_SIDE } from './constants.ts';
import { shouldDrawFineGrid } from './canvas-perf.ts';

// Área visível da grade: origem e zoom da câmera, viewport e limites de mundo já recortados
export interface GridView {
  originX: number;
  originY: number;
  zoom: number;
  viewportW: number;
  viewportH: number;
  worldLeft: number;
  worldRight: number;
  worldTop: number;
  worldBottom: number;
}

/** Um único path por estilo; x/y de tela calculados direto da origem (origin + w * zoom). */
function strokeLines(
  ctx: CanvasRenderingContext2D,
  v: GridView,
  step: number,
  style: string,
  skip: (w: number) => boolean
): void {
  const size = GRID_SIDE * v.zoom;
  const top = Math.max(v.originY, 0);
  const bottom = Math.min(v.originY + size, v.viewportH);
  const left = Math.max(v.originX, 0);
  const right = Math.min(v.originX + size, v.viewportW);
  ctx.strokeStyle = style;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let wx = Math.floor(v.worldLeft / step) * step; wx <= Math.ceil(v.worldRight / step) * step; wx += step) {
    if (skip(wx)) continue;
    const sx = Math.round(v.originX + wx * v.zoom) + 0.5;
    ctx.moveTo(sx, top);
    ctx.lineTo(sx, bottom);
  }
  for (let wy = Math.floor(v.worldTop / step) * step; wy <= Math.ceil(v.worldBottom / step) * step; wy += step) {
    if (skip(wy)) continue;
    const sy = Math.round(v.originY + wy * v.zoom) + 0.5;
    ctx.moveTo(left, sy);
    ctx.lineTo(right, sy);
  }
  ctx.stroke();
}

const isEdge = (w: number) => w === 0 || w === GRID_SIDE;

/** Linhas de referência de 5, 50 e 100 px da grade. */
export function drawGridLines(ctx: CanvasRenderingContext2D, v: GridView): void {
  if (v.worldLeft >= v.worldRight || v.worldTop >= v.worldBottom) return;
  if (shouldDrawFineGrid(v.zoom)) {
    const opacity = Math.min(0.08, (v.zoom - FINE_GRID_MIN_ZOOM) * 0.04);
    strokeLines(ctx, v, 5, `rgba(100, 116, 139, ${opacity.toFixed(3)})`, (w) => w % 50 === 0);
  }
  if (v.zoom >= 0.4) {
    strokeLines(ctx, v, 50, 'rgba(106, 51, 120, 0.07)', (w) => w % 100 === 0 || isEdge(w));
  }
  strokeLines(ctx, v, 100, 'rgba(106, 51, 120, 0.12)', isEdge);
}
