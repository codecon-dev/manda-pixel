import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from '@/app/lib/constants';
import { pixelsLabel, priceLabel, toCanvasRect, viewWindow } from '@/app/lib/logo-preview';
import type { GridBlock } from '@/app/lib/db';
import type { PreviewRect } from '@/types/preview';

const MAP_SIZE = PREVIEW_HEIGHT;
const PANEL_X = MAP_SIZE;
const PANEL_PAD = 48;
const GRID_LINE_STEP = 10;
const OUTLINE_WIDTH = 3;
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
}

function drawGrid(ctx: CanvasRenderingContext2D, scene: PreviewScene): void {
  const win = viewWindow(scene.rect.x, scene.rect.y, scene.rect.w);
  const scale = MAP_SIZE / win.size;
  ctx.fillStyle = COLORS.grid;
  ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  ctx.fillStyle = COLORS.gridLine;
  for (let g = 0; g <= win.size; g += GRID_LINE_STEP) {
    const p = Math.round(g * scale);
    ctx.fillRect(p, 0, 1, MAP_SIZE);
    ctx.fillRect(0, p, MAP_SIZE, 1);
  }
  for (const b of scene.blocks) {
    const r = toCanvasRect(b, win, MAP_SIZE);
    if (r.x + r.w < 0 || r.y + r.h < 0 || r.x > MAP_SIZE || r.y > MAP_SIZE) continue;
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

function drawLogo(ctx: CanvasRenderingContext2D, scene: PreviewScene): void {
  const win = viewWindow(scene.rect.x, scene.rect.y, scene.rect.w);
  const r = toCanvasRect(scene.rect, win, MAP_SIZE);
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
    const labelY = inside ? r.y + r.h / 2 : r.y + r.h + LABEL_PX + OUTLINE_WIDTH;
    if (!inside) drawLabelPill(ctx, 'seu logo', r.x + r.w / 2, labelY);
    ctx.fillStyle = inside ? COLORS.ink : COLORS.white;
    ctx.fillText('seu logo', r.x + r.w / 2, labelY);
  }
  ctx.strokeStyle = COLORS.yellow;
  ctx.lineWidth = OUTLINE_WIDTH;
  ctx.strokeRect(r.x - OUTLINE_WIDTH / 2, r.y - OUTLINE_WIDTH / 2, r.w + OUTLINE_WIDTH, r.h + OUTLINE_WIDTH);
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

/** Desenha a previa inteira (grade a esquerda, painel roxo a direita) no canvas 1200x630. */
export function drawPreview(canvas: HTMLCanvasElement, scene: PreviewScene): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d indisponível');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, MAP_SIZE, MAP_SIZE);
  ctx.clip();
  drawGrid(ctx, scene);
  drawLogo(ctx, scene);
  ctx.restore();
  drawPanel(ctx, scene.rect);
}
