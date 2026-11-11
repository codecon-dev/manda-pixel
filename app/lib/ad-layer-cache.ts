import type { GridBlock } from './db';
import { GRID_SIDE, SMOOTH_MIN_SCALE } from './constants.ts';

// Imagens dos anúncios, carregadas uma vez e reutilizadas (chave: id do bloco)
export type AdImages = Map<string, HTMLImageElement>;

export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Começa a carregar a imagem de cada anúncio publicado que ainda não está no mapa. */
export function loadAdImages(blocks: GridBlock[], images: AdImages, onLoad: () => void): void {
  for (const block of blocks) {
    if (block.state !== 'published' || !block.imageUrl || images.has(block.id)) continue;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = onLoad;
    img.src = block.imageUrl;
    images.set(block.id, img);
  }
}

function drawPublished(ctx: CanvasRenderingContext2D, block: GridBlock, r: ScreenRect, images: AdImages): void {
  const img = images.get(block.id);
  if (img && img.complete && img.naturalWidth > 0) {
    // Imagem nova (grande) fica suave; anúncio antigo de 1 px por pixel fica nítido
    ctx.imageSmoothingEnabled = img.naturalWidth >= block.w * SMOOTH_MIN_SCALE;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
  } else {
    // Fallback enquanto a imagem carrega
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#94a3b8';
    const dotSize = Math.max(2, Math.min(6, Math.min(r.w, r.h) * 0.25));
    ctx.beginPath();
    ctx.arc(r.x + r.w / 2, r.y + r.h / 2, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
}

function drawInReview(ctx: CanvasRenderingContext2D, r: ScreenRect, zoom: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // Listras diagonais
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
  ctx.lineWidth = Math.max(1, 1.2 * (zoom >= 2 ? 1.5 : 1));
  ctx.beginPath();
  const stripeStep = Math.max(6, 8 * zoom * 0.5);
  for (let d = -r.h; d < r.w + r.h; d += stripeStep) {
    ctx.moveTo(r.x + d, r.y);
    ctx.lineTo(r.x + d + r.h, r.y + r.h);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
}

function drawReserved(ctx: CanvasRenderingContext2D, r: ScreenRect): void {
  ctx.save();
  ctx.fillStyle = 'rgba(147, 51, 234, 0.16)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = '#9333ea';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

/** Desenha um bloco ocupado (publicado, em análise ou reservado) no retângulo dado. */
export function drawAdBlock(
  ctx: CanvasRenderingContext2D,
  block: GridBlock,
  rect: ScreenRect,
  zoom: number,
  images: AdImages
): void {
  if (block.state === 'published') drawPublished(ctx, block, rect, images);
  else if (block.state === 'in_review') drawInReview(ctx, rect, zoom);
  else if (block.state === 'reserved') drawReserved(ctx, rect);
}

/** Pinta todos os anúncios num canvas 1000x1000 (1 px de mundo = 1 px). Reaproveita `target` se vier. */
export function buildAdLayer(blocks: GridBlock[], images: AdImages, target?: HTMLCanvasElement): HTMLCanvasElement {
  const layer = target ?? document.createElement('canvas');
  if (layer.width !== GRID_SIDE) layer.width = GRID_SIDE;
  if (layer.height !== GRID_SIDE) layer.height = GRID_SIDE;
  const ctx = layer.getContext('2d');
  if (!ctx) throw new Error('ad-layer-cache: contexto 2d indisponível');
  ctx.clearRect(0, 0, GRID_SIDE, GRID_SIDE);
  for (const block of blocks) {
    drawAdBlock(ctx, block, { x: block.x, y: block.y, w: block.w, h: block.h }, 1, images);
  }
  return layer;
}
