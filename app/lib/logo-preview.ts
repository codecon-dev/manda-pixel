import { BLOCK_SIZE, GRID_MAX_COORD, PIXEL_PRICE_BRL, PREVIEW_WINDOW } from './constants.ts';
import type { GridBlock } from './db.ts';
import type { PreviewRect, PreviewWindow } from '../../types/preview.ts';

const GRID_SIZE = GRID_MAX_COORD + 1;
const MAX_RINGS = GRID_SIZE / BLOCK_SIZE;

export class NoFreeSpaceError extends Error {
  constructor() {
    super('nenhum espaço livre na grade para esse tamanho');
    this.name = 'NoFreeSpaceError';
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Janela de PREVIEW_WINDOW x PREVIEW_WINDOW da grade, centrada no retangulo e travada dentro de 0..1000. */
export function viewWindow(x: number, y: number, size: number): PreviewWindow {
  const maxStart = GRID_SIZE - PREVIEW_WINDOW;
  const half = PREVIEW_WINDOW / 2;
  return {
    x: clamp(Math.round(x + size / 2 - half), 0, maxStart),
    y: clamp(Math.round(y + size / 2 - half), 0, maxStart),
    size: PREVIEW_WINDOW,
  };
}

/** Converte um retangulo da grade para pixels de um canvas quadrado de lado canvasSize. */
export function toCanvasRect(rect: PreviewRect, win: PreviewWindow, canvasSize: number): PreviewRect {
  const scale = canvasSize / win.size;
  return {
    x: (rect.x - win.x) * scale,
    y: (rect.y - win.y) * scale,
    w: rect.w * scale,
    h: rect.h * scale,
  };
}

/** Verdadeiro se o retangulo cruza algum bloco (qualquer estado). */
export function overlaps(rect: PreviewRect, blocks: readonly GridBlock[]): boolean {
  return blocks.some(
    (b) => rect.x < b.x + b.w && b.x < rect.x + rect.w && rect.y < b.y + b.h && b.y < rect.y + rect.h,
  );
}

function insideGrid(rect: PreviewRect): boolean {
  return rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= GRID_SIZE && rect.y + rect.h <= GRID_SIZE;
}

/** Canto encaixado em multiplo de BLOCK_SIZE e dentro da grade para um quadrado de lado size. */
export function snapRect(x: number, y: number, size: number): PreviewRect {
  const maxStart = GRID_SIZE - size;
  const snap = (n: number) => clamp(Math.floor(n / BLOCK_SIZE) * BLOCK_SIZE, 0, maxStart);
  return { x: snap(x), y: snap(y), w: size, h: size };
}

function ringCandidates(rect: PreviewRect, ring: number): PreviewRect[] {
  const out: PreviewRect[] = [];
  const d = ring * BLOCK_SIZE;
  for (let dx = -d; dx <= d; dx += BLOCK_SIZE) {
    for (let dy = -d; dy <= d; dy += BLOCK_SIZE) {
      if (Math.abs(dx) !== d && Math.abs(dy) !== d) continue;
      out.push({ x: rect.x + dx, y: rect.y + dy, w: rect.w, h: rect.h });
    }
  }
  return out;
}

/**
 * Lugar livre mais perto do retangulo, buscando em aneis de BLOCK_SIZE em volta dele.
 * Lanca NoFreeSpaceError se a grade nao tiver espaco para esse tamanho.
 */
export function nearestFree(rect: PreviewRect, blocks: readonly GridBlock[]): PreviewRect {
  if (insideGrid(rect) && !overlaps(rect, blocks)) return rect;
  for (let ring = 1; ring <= MAX_RINGS; ring++) {
    const free = ringCandidates(rect, ring).filter((c) => insideGrid(c) && !overlaps(c, blocks));
    if (free.length === 0) continue;
    const dist = (c: PreviewRect) => (c.x - rect.x) ** 2 + (c.y - rect.y) ** 2;
    return free.reduce((best, c) => (dist(c) < dist(best) ? c : best));
  }
  throw new NoFreeSpaceError();
}

/** "R$ 2.500,00" (espaco normal, sem o nao-quebravel do Intl). */
export function priceLabel(pixels: number): string {
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pixels * PIXEL_PRICE_BRL);
  return brl.replace(/\s/g, ' ');
}

/** "2.500" */
export function pixelsLabel(pixels: number): string {
  return pixels.toLocaleString('pt-BR');
}
