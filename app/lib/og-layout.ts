/** Layout puro da imagem de compartilhamento (OG) da pagina de anuncio. Sem imports com @/ para rodar no node --test. */

/** Lado da grade em pixels (1.000 x 1.000). */
export const GRID_SIDE = 1000;

export type MarkerRect = { left: number; top: number; width: number; height: number };

/** Maior fator inteiro (minimo 1) para o maior lado caber na caixa. */
export function ogIntegerScale(w: number, h: number, box: number): number {
  const longest = Math.max(1, w, h);
  return Math.max(1, Math.floor(box / longest));
}

/** "1 pixel", "2.500 pixels". */
export function pixelsLabel(pixels: number): string {
  const n = pixels.toLocaleString('pt-BR');
  return `${n} ${pixels === 1 ? 'pixel' : 'pixels'}`;
}

export function positionLabel(x: number, y: number): string {
  return `na posição (${x}, ${y})`;
}

/** Retangulo do anuncio num mini mapa quadrado de mapSize px, com tamanho minimo visivel e sempre dentro do mapa. */
export function markerRect(
  ad: { x: number; y: number; w: number; h: number },
  mapSize: number,
  minSize = 14
): MarkerRect {
  const k = mapSize / GRID_SIDE;
  const width = Math.max(minSize, Math.round(ad.w * k));
  const height = Math.max(minSize, Math.round(ad.h * k));
  const left = Math.min(mapSize - width, Math.max(0, Math.round(ad.x * k)));
  const top = Math.min(mapSize - height, Math.max(0, Math.round(ad.y * k)));
  return { left, top, width, height };
}
