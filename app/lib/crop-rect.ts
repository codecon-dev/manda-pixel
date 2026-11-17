import type { CropMode, CropOffset, CropRect, CropRectInput } from '../../types/crop.ts';
import { CROP_CONTAIN_ASPECT_TOLERANCE } from './constants.ts';

/** Tamanho desenhado (antes do offset), em unidades do bloco. */
function drawSize(input: CropRectInput): { w: number; h: number } {
  const { imgW, imgH, blockW, blockH, mode, zoom } = input;
  const imgAspect = imgW / imgH;
  const blockAspect = blockW / blockH;
  const widerThanBlock = imgAspect > blockAspect;
  // cover: base pelo lado que sobra; contain: base pelo lado que limita
  const fitByHeight = mode === 'cover' ? widerThanBlock : !widerThanBlock;
  const baseW = fitByHeight ? blockH * imgAspect : blockW;
  const baseH = fitByHeight ? blockH : blockW / imgAspect;
  return { w: baseW * zoom, h: baseH * zoom };
}

function clampAxis(offset: number, size: number, block: number): number {
  // Maior que o bloco: nunca sobra borda vazia. Menor: nunca sai do bloco.
  const limit = Math.abs(size - block) / 2;
  return Math.min(limit, Math.max(-limit, offset));
}

/** Limita o deslocamento (unidades do bloco, relativo ao centro) ao que o modo permite. */
export function clampOffset(input: CropRectInput): CropOffset {
  const { w, h } = drawSize(input);
  return {
    x: clampAxis(input.offsetX, w, input.blockW),
    y: clampAxis(input.offsetY, h, input.blockH),
  };
}

/** Retângulo onde a imagem é desenhada no bloco (blockW x blockH), com offset já limitado. */
export function computeCropRect(input: CropRectInput): CropRect {
  const { w, h } = drawSize(input);
  const off = clampOffset(input);
  return {
    x: (input.blockW - w) / 2 + off.x,
    y: (input.blockH - h) / 2 + off.y,
    w,
    h,
  };
}

/** Modo padrão: "Encaixar" quando a proporção da imagem difere da do bloco em mais da tolerância. */
export function defaultCropMode(imgW: number, imgH: number, blockW: number, blockH: number): CropMode {
  const ratio = imgW / imgH / (blockW / blockH);
  return Math.abs(ratio - 1) > CROP_CONTAIN_ASPECT_TOLERANCE ? 'contain' : 'cover';
}
