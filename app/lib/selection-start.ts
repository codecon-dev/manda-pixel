// Ponto de partida da seleção criada pelo botão "Comprar pixels":
// canto superior esquerdo de um bloco w x h centrado no centro visível da câmera.

export const GRID_SIDE = 1000;

export interface GridPoint {
  x: number;
  y: number;
}

export function selectionStartFromCamera(center: GridPoint, w: number, h: number): GridPoint {
  const clamp = (value: number, max: number): number => Math.max(0, Math.min(max, value));
  return {
    x: clamp(Math.round(center.x - w / 2), GRID_SIDE - w),
    y: clamp(Math.round(center.y - h / 2), GRID_SIDE - h),
  };
}
