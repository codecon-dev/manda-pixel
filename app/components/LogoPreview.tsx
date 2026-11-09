'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import LogoPreviewControls, { LogoPreviewActions } from './LogoPreviewControls';
import { drawPreview } from './logoPreviewCanvas';
import { BLOCK_SIZE, GRID_MAX_COORD, MAX_UPLOAD_BYTES, PREVIEW_HEIGHT, PREVIEW_WIDTH, SITE_URL } from '@/app/lib/constants';
import { NoFreeSpaceError, nearestFree, overlaps, snapRect, viewWindow } from '@/app/lib/logo-preview';
import { trackPreviewLogo } from '@/app/lib/analytics';
import type { GridBlock, GridResponse } from '@/app/lib/db';
import type { PreviewRect } from '@/types/preview';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const DEFAULT_SIZE = 20;
const DOWNLOAD_NAME = 'manda-pixel-previa.png';
const SHARE_TEXT = 'olha meu logo na grade do Manda Pixel';
function parseCoordText(text: string): number {
  const n = Math.floor(Number(text));
  if (!Number.isFinite(n)) return 0;
  return Math.min(GRID_MAX_COORD, Math.max(0, n));
}

type Placement = { rect: PreviewRect; notice: string | null };

function placeRect(x: number, y: number, size: number, blocks: readonly GridBlock[]): Placement {
  const raw = { x: Math.floor(x / BLOCK_SIZE) * BLOCK_SIZE, y: Math.floor(y / BLOCK_SIZE) * BLOCK_SIZE };
  const snapped = snapRect(x, y, size);
  try {
    const rect = nearestFree(snapped, blocks);
    const moved = rect.x !== raw.x || rect.y !== raw.y;
    return { rect, notice: moved ? `Esse lugar tá ocupado, movi para (${rect.x}, ${rect.y})` : null };
  } catch (err) {
    if (!(err instanceof NoFreeSpaceError)) throw err;
    return { rect: snapped, notice: 'Não achei espaço livre desse tamanho. Tenta um tamanho menor.' };
  }
}

/** Carrega (uma vez) as imagens dos anuncios publicados que aparecem na janela; avisa quando cada uma chega. */
function useBlockImages(blocks: readonly GridBlock[], rect: PreviewRect, onLoad: () => void) {
  const cache = useRef(new Map<string, HTMLImageElement>());
  useEffect(() => {
    const win = viewWindow(rect.x, rect.y, rect.w);
    const winRect = { x: win.x, y: win.y, w: win.size, h: win.size };
    const visible = blocks.filter((b) => b.imageUrl && b.state === 'published' && overlaps(winRect, [b]));
    for (const b of visible) {
      const url = b.imageUrl as string;
      if (cache.current.has(url)) continue;
      const img = new Image();
      img.onload = onLoad;
      img.src = url;
      cache.current.set(url, img);
    }
  }, [blocks, rect, onLoad]);
  return cache.current;
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('falha ao gerar PNG'))), 'image/png');
  });
}

async function downloadCanvas(canvas: HTMLCanvasElement): Promise<void> {
  const url = URL.createObjectURL(await canvasBlob(canvas));
  const a = document.createElement('a');
  a.href = url;
  a.download = DOWNLOAD_NAME;
  a.click();
  URL.revokeObjectURL(url);
}

/** Compartilha o PNG pelo sistema quando da; senao abre o post no X com o link da posicao. */
async function shareCanvas(canvas: HTMLCanvasElement, url: string): Promise<void> {
  const file = new File([await canvasBlob(canvas)], DOWNLOAD_NAME, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: SHARE_TEXT, url });
    } catch (err) {
      // Cancelar a folha de compartilhamento nao e erro; o resto sobe.
      if (!(err instanceof DOMException && err.name === 'AbortError')) throw err;
    }
    return;
  }
  const intent = `https://x.com/intent/post?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(url)}`;
  window.open(intent, '_blank', 'noopener');
}

export default function LogoPreview({ initialX, initialY }: { initialX: number; initialY: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blocks, setBlocks] = useState<GridBlock[]>([]);
  const [xText, setXText] = useState(String(initialX));
  const [yText, setYText] = useState(String(initialY));
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [gridError, setGridError] = useState<string | null>(null);
  const [redraw, setRedraw] = useState(0);
  const bump = useMemo(() => () => setRedraw((n) => n + 1), []);

  useEffect(() => {
    fetch('/api/grid', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<GridResponse>;
      })
      .then((data) => setBlocks(data.blocks))
      .catch(() => setGridError('Não consegui carregar a grade agora. A prévia mostra a grade vazia.'));
    document.fonts?.ready.then(bump);
  }, [bump]);

  const { rect, notice } = useMemo(
    () => placeRect(parseCoordText(xText), parseCoordText(yText), size, blocks),
    [xText, yText, size, blocks],
  );
  const images = useBlockImages(blocks, rect, bump);
  const track = { x: rect.x, y: rect.y, tamanho: size };

  useEffect(() => {
    if (canvasRef.current) drawPreview(canvasRef.current, { rect, blocks, images, logo });
  }, [rect, blocks, images, logo, redraw]);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) return setFileError('Esse formato não rola. Usa PNG, JPG, WebP ou SVG.');
    if (file.size > MAX_UPLOAD_BYTES) return setFileError('Imagem grande demais. O limite é 5 MB.');
    setFileError(null);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      setLogo(img);
      setFileName(file.name);
    };
    img.onerror = () => setFileError('Não consegui abrir essa imagem. Tenta outro arquivo.');
    img.src = URL.createObjectURL(file);
    trackPreviewLogo('upload', track);
  }

  async function download() {
    if (!canvasRef.current) return;
    await downloadCanvas(canvasRef.current);
    trackPreviewLogo('download', track);
  }

  async function share() {
    if (!canvasRef.current) return;
    trackPreviewLogo('share', track);
    await shareCanvas(canvasRef.current, `${SITE_URL}/?x=${rect.x}&y=${rect.y}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="min-w-0">
        <canvas
          ref={canvasRef}
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
          className="block h-auto w-full rounded-xl border border-stone-200 shadow-sm"
          aria-label={`Prévia do seu logo na posição (${rect.x}, ${rect.y}) da grade`}
          role="img"
        />
        {gridError && <p className="mt-2 text-sm text-stone-700">{gridError}</p>}
      </div>
      <div className="space-y-4">
        <LogoPreviewControls
          xText={xText}
          yText={yText}
          size={size}
          fileError={fileError}
          fileName={fileName}
          onFile={onFile}
          onX={setXText}
          onY={setYText}
          onSize={setSize}
        />
        <LogoPreviewActions
          notice={notice}
          buyHref={`/?x=${rect.x}&y=${rect.y}`}
          onDownload={download}
          onShare={share}
          onBuy={() => trackPreviewLogo('comprar', track)}
        />
      </div>
    </div>
  );
}
