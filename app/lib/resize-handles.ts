// Alças de redimensionar o bloco selecionado: quais aparecem e onde ficam, em px de tela.
// Fonte única para o desenho e o hit-test do PixelCanvas.

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

/** Abaixo disso (menor lado do bloco na tela), só a alça 'se', fora do bloco. */
export const HANDLE_CORNER_MIN_PX = 28;
/** A partir disso, alças de lado: 'n'/'s' pela largura, 'e'/'w' pela altura. */
export const HANDLE_SIDE_MIN_PX = 40;
/** Lado da alça de canto desenhada. */
export const HANDLE_CORNER_SIZE_PX = 10;
/** Deslocamento diagonal da 'se' externa: o quadrado inteiro fica fora do bloco, com folga. */
export const HANDLE_OUTSIDE_OFFSET_PX = HANDLE_CORNER_SIZE_PX / 2 + 3;
/** Raio de toque das alças de canto e de lado. */
export const HANDLE_CORNER_HIT_PX = 18;
export const HANDLE_SIDE_HIT_PX = 14;

export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HandlePosition {
  handle: ResizeHandle;
  x: number;
  y: number;
  corner: boolean;
}

export function getVisibleHandles(bW: number, bH: number): ResizeHandle[] {
  if (Math.min(bW, bH) < HANDLE_CORNER_MIN_PX) return ['se'];
  const handles: ResizeHandle[] = ['nw', 'ne', 'sw', 'se'];
  if (bW >= HANDLE_SIDE_MIN_PX) handles.push('n', 's');
  if (bH >= HANDLE_SIDE_MIN_PX) handles.push('e', 'w');
  return handles;
}

/** Bloco pequeno demais: só a 'se', deslocada para fora do canto inferior direito. */
export function isCompactSelection(bW: number, bH: number): boolean {
  return Math.min(bW, bH) < HANDLE_CORNER_MIN_PX;
}

export function getHandlePositions(r: ScreenRect): HandlePosition[] {
  const right = r.x + r.w;
  const bottom = r.y + r.h;
  const midX = r.x + r.w / 2;
  const midY = r.y + r.h / 2;
  const out = isCompactSelection(r.w, r.h) ? HANDLE_OUTSIDE_OFFSET_PX : 0;
  const centers: Record<ResizeHandle, [number, number]> = {
    nw: [r.x, r.y],
    ne: [right, r.y],
    sw: [r.x, bottom],
    se: [right + out, bottom + out],
    n: [midX, r.y],
    s: [midX, bottom],
    e: [right, midY],
    w: [r.x, midY],
  };
  return getVisibleHandles(r.w, r.h).map((handle) => {
    const [x, y] = centers[handle];
    return { handle, x, y, corner: handle.length === 2 };
  });
}

/** Alça sob o ponto, 'move' se dentro do bloco, ou null. Só considera alças visíveis. */
export function hitTestHandles(px: number, py: number, r: ScreenRect): ResizeHandle | 'move' | null {
  const inside = px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  // Bloco compacto: o interior vence, para a alça externa não roubar o arraste do bloco.
  if (inside && isCompactSelection(r.w, r.h)) return 'move';
  for (const p of getHandlePositions(r)) {
    const radius = p.corner ? HANDLE_CORNER_HIT_PX : HANDLE_SIDE_HIT_PX;
    if (Math.hypot(px - p.x, py - p.y) <= radius) return p.handle;
  }
  return inside ? 'move' : null;
}
