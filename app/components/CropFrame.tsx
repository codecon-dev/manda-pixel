'use client';

import React, { useRef } from 'react';
import {
  CROP_FRAME_MAX_PX,
  CROP_FRAME_MIN_PX,
  CROP_FRAME_PX_PER_PIXEL,
  CROP_PIXELATED_MAX_SIDE,
} from '../lib/constants.ts';

interface CropFrameProps {
  previewUrl: string | null;
  targetW: number;
  targetH: number;
  /** Deslocamento do arraste em unidades do bloco; quem recebe faz o clamp. */
  onDrag: (dx: number, dy: number) => void;
}

/** Prévia do PNG final (o mesmo que vai pro servidor), arrastável para reposicionar. */
export default function CropFrame({ previewUrl, targetW, targetH, onDrag }: CropFrameProps) {
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const longest = Math.max(targetW, targetH);
  const side = Math.min(CROP_FRAME_MAX_PX, Math.max(CROP_FRAME_MIN_PX, longest * CROP_FRAME_PX_PER_PIXEL));
  const pixelated = longest <= CROP_PIXELATED_MAX_SIDE;

  const handleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    lastPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const last = lastPoint.current;
    if (!last) return;
    const frameWidthPx = e.currentTarget.getBoundingClientRect().width;
    if (frameWidthPx <= 0) return;
    const unitsPerPx = targetW / frameWidthPx;
    onDrag((e.clientX - last.x) * unitsPerPx, (e.clientY - last.y) * unitsPerPx);
    lastPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    lastPoint.current = null;
  };

  return (
    <div
      role="img"
      aria-label={`Prévia do anúncio em ${targetW}x${targetH} pixels. Arraste para ajustar a posição.`}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      style={{
        width: `${(side * targetW) / longest}px`,
        aspectRatio: `${targetW} / ${targetH}`,
        touchAction: 'none',
      }}
      className="relative overflow-hidden border border-purple-400 bg-white rounded shadow-inner cursor-grab active:cursor-grabbing select-none"
    >
      {previewUrl && (
        <img
          src={previewUrl}
          alt=""
          draggable={false}
          style={{ imageRendering: pixelated ? 'pixelated' : 'auto' }}
          className="block w-full h-full pointer-events-none"
        />
      )}
    </div>
  );
}
