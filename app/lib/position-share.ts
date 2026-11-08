/** Link compartilhavel de uma posicao da grade (/?x=&y=). Funcoes puras, sem imports com @/ para rodar no node --test. */
import { BLOCK_SIZE, GRID_MAX_COORD } from './constants.ts';

/** Caminho da home aberta focada na posicao. */
export function positionSharePath(x: number, y: number): string {
  return `/?x=${x}&y=${y}`;
}

/** Caminho da imagem de compartilhamento (OG) da posicao. */
export function positionOgPath(x: number, y: number): string {
  return `/og/posicao?x=${x}&y=${y}`;
}

/** "Posição X: 500, Y: 500" (mesmo texto do HUD da grade). */
export function positionHeading(x: number, y: number): string {
  return `Posição X: ${x}, Y: ${y}`;
}

export function positionMetaTitle(x: number, y: number): string {
  return `${positionHeading(x, y)} no Manda Pixel`;
}

/** livre: bloco 5x5 da posicao ainda disponivel; null quando nao deu para saber. */
export function positionMetaDescription(livre: boolean | null): string {
  if (livre === true) return 'Esse lugar da grade ainda está livre. R$ 1 por pixel e o anúncio fica pra sempre.';
  if (livre === false) return 'Esse lugar da grade já tem dono. Tem muito pixel livre em volta, a R$ 1 cada.';
  return 'Um lugar na grade de 1 milhão de pixels a R$ 1 cada. O anúncio fica pra sempre.';
}

/** Canto do bloco 5x5 que contem a coordenada (multiplo de BLOCK_SIZE, dentro da grade). */
export function snapToBlock(n: number): number {
  const maxStart = GRID_MAX_COORD + 1 - BLOCK_SIZE;
  return Math.min(maxStart, Math.max(0, Math.floor(n / BLOCK_SIZE) * BLOCK_SIZE));
}
