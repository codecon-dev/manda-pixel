/** Retangulo em coordenadas da grade (ou do canvas, conforme o uso). */
export interface PreviewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Janela quadrada da grade mostrada na previa. */
export interface PreviewWindow {
  x: number;
  y: number;
  size: number;
}

export type PreviewLogoAction = 'upload' | 'download' | 'share' | 'comprar';
