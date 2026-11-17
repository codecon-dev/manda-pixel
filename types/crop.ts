export type CropMode = 'cover' | 'contain';

export interface CropRectInput {
  imgW: number;
  imgH: number;
  blockW: number;
  blockH: number;
  mode: CropMode;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

/** Retângulo onde a imagem é desenhada, em unidades do bloco. */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CropOffset {
  x: number;
  y: number;
}
