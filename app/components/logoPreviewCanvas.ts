import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from '@/app/lib/constants';
import { pixelsLabel, previewWindowSize, priceLabel, toCanvasRect, viewWindow } from '@/app/lib/logo-preview';
import type { GridBlock } from '@/app/lib/db';
import type { PreviewRect, PreviewWindow, PreviewZoom } from '@/types/preview';

const MAP_SIZE = PREVIEW_HEIGHT;
const PANEL_X = MAP_SIZE;
const PANEL_PAD = 48;
const GRID_LINE_STEP = 10;
// Linhas da grade so aparecem com 3 px de canvas ou mais por pixel da grade
const GRID_LINE_MIN_SCALE = 3;
const OUTLINE_WIDTH = 3;
// Contorno do logo nunca menor que 1% do lado do mapa (~3 px de tela num celular de 390 px)
const OUTLINE_MIN_FRACTION = 0.01;
const MIN_LABEL_SIDE = 70;
const PANEL_TEXT_WIDTH = PREVIEW_WIDTH - PANEL_X - PANEL_PAD * 2;
const TITLE_MAX_PX = 48;
const MIN_FONT_PX = 20;
const FOOTER_MAX_PX = 30;
const BODY_MAX_PX = 40;
const LABEL_PX = 30;

const COLORS = {
  grid: '#ffffff',
  gridLine: 'rgba(161, 161, 170, 0.25)',
  ad: '#6A3378',
  pending: '#a1a1aa',
  purple: '#6A3378',
  yellow: '#FCD953',
  white: '#ffffff',
  placeholder: 'rgba(252, 217, 83, 0.6)',
  ink: '#1c1917',
};

const DISPLAY_FONT = 'Silkscreen, ui-monospace, monospace';
const BODY_FONT = '"Space Grotesk", system-ui, sans-serif';

export interface PreviewScene {
  rect: PreviewRect;
  blocks: readonly GridBlock[];
  images: ReadonlyMap<string, HTMLImageElement>;
  logo: HTMLImageElement | null;
  zoom: PreviewZoom;
}

/** Janela da grade mostrada para a cena (centrada no logo, lado pelo zoom). */
export function sceneWindow(scene: Pick<PreviewScene, 'rect' | 'zoom'>): PreviewWindow {
  const { rect, zoom } = scene;
  return viewWindow(rect.x, rect.y, rect.w, previewWindowSize(rect.w, rect.h, zoom));
}

function drawGrid(ctx: CanvasRenderingContext2D, size: number, scene: PreviewScene, win: PreviewWindow): void {
  const scale = size / win.size;
  ctx.fillStyle = COLORS.grid;
  ctx.fillRect(0, 0, size, size);
  if (scale >= GRID_LINE_MIN_SCALE) {
    ctx.fillStyle = COLORS.gridLine;
    for (let g = GRID_LINE_STEP - (win.x % GRID_LINE_STEP); g <= win.size; g += GRID_LINE_STEP) {
      ctx.fillRect(Math.round(g * scale), 0, 1, size);
    }
    for (let g = GRID_LINE_STEP - (win.y % GRID_LINE_STEP); g <= win.size; g += GRID_LINE_STEP) {
      ctx.fillRect(0, Math.round(g * scale), size, 1);
    }
  }
  for (const b of scene.blocks) {
    const r = toCanvasRect(b, win, size);
    if (r.x + r.w < 0 || r.y + r.h < 0 || r.x > size || r.y > size) continue;
    const img = b.imageUrl ? scene.images.get(b.imageUrl) : undefined;
    if (b.state === 'published' && img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, r.x, r.y, r.w, r.h);
    } else {
      ctx.fillStyle = b.state === 'published' ? COLORS.ad : COLORS.pending;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }
}

function drawLabelPill(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number): void {
  const w = ctx.measureText(text).width + LABEL_PX;
  const h = LABEL_PX * 1.6;
  ctx.fillStyle = COLORS.purple;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
}

function drawLogo(ctx: CanvasRenderingContext2D, size: number, scene: PreviewScene, win: PreviewWindow): void {
  const r = toCanvasRect(scene.rect, win, size);
  const outline = Math.max(OUTLINE_WIDTH, size * OUTLINE_MIN_FRACTION);
  if (scene.logo && scene.logo.naturalWidth > 0) {
    const { naturalWidth: iw, naturalHeight: ih } = scene.logo;
    const fit = Math.min(r.w / iw, r.h / ih);
    const w = iw * fit;
    const h = ih * fit;
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.drawImage(scene.logo, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h);
  } else {
    ctx.fillStyle = COLORS.placeholder;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    const inside = r.w >= MIN_LABEL_SIDE;
    ctx.font = `700 ${LABEL_PX}px ${BODY_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelY = inside ? r.y + r.h / 2 : r.y + r.h + LABEL_PX + outline;
    if (!inside) drawLabelPill(ctx, 'seu logo', r.x + r.w / 2, labelY);
    ctx.fillStyle = inside ? COLORS.ink : COLORS.white;
    ctx.fillText('seu logo', r.x + r.w / 2, labelY);
  }
  ctx.strokeStyle = COLORS.yellow;
  ctx.lineWidth = outline;
  ctx.strokeRect(r.x - outline / 2, r.y - outline / 2, r.w + outline, r.h + outline);
}

/** Maior fonte (ate maxPx) em que o texto cabe em maxWidth. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxPx: number, maxWidth: number, family: string): string {
  let px = maxPx;
  ctx.font = `700 ${px}px ${family}`;
  while (px > MIN_FONT_PX && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = `700 ${px}px ${family}`;
  }
  return ctx.font;
}

function drawPanel(ctx: CanvasRenderingContext2D, rect: PreviewRect): void {
  const pixels = rect.w * rect.h;
  const left = PANEL_X + PANEL_PAD;
  ctx.fillStyle = COLORS.purple;
  ctx.fillRect(PANEL_X, 0, PREVIEW_WIDTH - PANEL_X, PREVIEW_HEIGHT);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.yellow;
  ctx.font = fitFont(ctx, 'Seu logo aqui', TITLE_MAX_PX, PANEL_TEXT_WIDTH, DISPLAY_FONT);
  ctx.fillText('Seu logo aqui', left, 150);
  ctx.fillStyle = COLORS.white;
  const position = `posição (${rect.x}, ${rect.y})`;
  ctx.font = fitFont(ctx, position, BODY_MAX_PX, PANEL_TEXT_WIDTH, BODY_FONT);
  ctx.fillText(position, left, 250);
  const price = `${pixelsLabel(pixels)} pixels • ${priceLabel(pixels)}`;
  ctx.font = fitFont(ctx, price, BODY_MAX_PX, PANEL_TEXT_WIDTH, BODY_FONT);
  ctx.fillText(price, left, 310);
  ctx.font = fitFont(ctx, 'fica no ar pra sempre', BODY_MAX_PX, PANEL_TEXT_WIDTH, BODY_FONT);
  ctx.fillText('fica no ar pra sempre', left, 390);
  ctx.fillStyle = COLORS.yellow;
  ctx.font = fitFont(ctx, 'mandapixel.com.br', FOOTER_MAX_PX, PANEL_TEXT_WIDTH, DISPLAY_FONT);
  ctx.fillText('mandapixel.com.br', left, PREVIEW_HEIGHT - PANEL_PAD);
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d indisponível');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Desenha o mapa (grade + anuncios + logo) num quadrado de lado size no canto (0,0) do contexto. */
export function drawMap(ctx: CanvasRenderingContext2D, size: number, scene: PreviewScene): void {
  const win = sceneWindow(scene);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.clip();
  drawGrid(ctx, size, scene, win);
  drawLogo(ctx, size, scene, win);
  ctx.restore();
}

/** Desenha so o mapa no canvas quadrado da tela. */
export function drawScreenMap(canvas: HTMLCanvasElement, scene: PreviewScene): void {
  const ctx = context2d(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap(ctx, canvas.width, scene);
}

/** Gera, fora da tela, a imagem de compartilhamento 1200x630: mapa a esquerda, painel roxo a direita. */
export function renderShareImage(scene: PreviewScene): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = PREVIEW_WIDTH;
  canvas.height = PREVIEW_HEIGHT;
  const ctx = context2d(canvas);
  drawMap(ctx, MAP_SIZE, scene);
  drawPanel(ctx, scene.rect);
  return canvas;
}
