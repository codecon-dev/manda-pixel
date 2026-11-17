'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cropScale } from '../lib/crop-scale.ts';
import { dominantColorRatio, BLANK_IMAGE_THRESHOLD } from '../lib/dominant-color.ts';
import { clampOffset, computeCropRect, defaultCropMode } from '../lib/crop-rect.ts';
import { CROP_ZOOM_MAX, CROP_ZOOM_MIN, CROP_ZOOM_STEP } from '../lib/constants.ts';
import type { CropMode, CropOffset, CropRectInput } from '../../types/crop.ts';
import CropFrame from './CropFrame';

const ZERO_OFFSET: CropOffset = { x: 0, y: 0 };
const CONTAIN_BACKGROUND = '#FFFFFF';
const CROP_MODE_OPTIONS: ReadonlyArray<{ mode: CropMode; label: string }> = [
  { mode: 'contain', label: 'Encaixar' },
  { mode: 'cover', label: 'Preencher' },
];

interface BuyPanelCropProps {
  targetW: number;
  targetH: number;
  onCroppedChange: (dataUrl: string | null) => void;
  error?: string;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export default function BuyPanelCrop({
  targetW,
  targetH,
  onCroppedChange,
  error,
}: BuyPanelCropProps) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [blankWarning, setBlankWarning] = useState<boolean>(false);
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [cropZoom, setCropZoom] = useState<number>(1);
  // Offset em unidades do bloco, relativo ao centro; sempre passa por clampOffset
  const [cropOffset, setCropOffset] = useState<CropOffset>(ZERO_OFFSET);
  const [cropMode, setCropMode] = useState<CropMode>('cover');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const cropInput = useCallback(
    (img: HTMLImageElement, zoom: number, offset: CropOffset): CropRectInput => ({
      imgW: img.naturalWidth,
      imgH: img.naturalHeight,
      blockW: targetW,
      blockH: targetH,
      mode: cropMode,
      zoom,
      offsetX: offset.x,
      offsetY: offset.y,
    }),
    [targetW, targetH, cropMode]
  );

  const generateCrop = useCallback(
    (img: HTMLImageElement, input: CropRectInput) => {
      // Guarda S px de imagem por pixel do bloco para o anúncio não ficar borrado ao ampliar
      const S = cropScale(input.blockW, input.blockH);
      const canvas = document.createElement('canvas');
      canvas.width = input.blockW * S;
      canvas.height = input.blockH * S;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (input.mode === 'contain') {
        ctx.fillStyle = CONTAIN_BACKGROUND;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const rect = computeCropRect(input);
      ctx.drawImage(img, rect.x * S, rect.y * S, rect.w * S, rect.h * S);
      const ratio = dominantColorRatio(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
      setBlankWarning(ratio > BLANK_IMAGE_THRESHOLD);
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewUrl(dataUrl);
      onCroppedChange(dataUrl);
    },
    [onCroppedChange]
  );

  useEffect(() => {
    if (!imgObj) return;
    generateCrop(imgObj, cropInput(imgObj, cropZoom, cropOffset));
  }, [imgObj, cropZoom, cropOffset, cropInput, generateCrop]);

  const handleDrag = (dx: number, dy: number) => {
    if (!imgObj) return;
    setCropOffset((prev) => clampOffset(cropInput(imgObj, cropZoom, { x: prev.x + dx, y: prev.y + dy })));
  };

  const handleZoom = (zoom: number) => {
    setCropZoom(zoom);
    if (imgObj) setCropOffset((prev) => clampOffset(cropInput(imgObj, zoom, prev)));
  };

  const handleMode = (mode: CropMode) => {
    setCropMode(mode);
    setCropOffset(ZERO_OFFSET);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setFileError('Formato inválido. Envie imagem PNG, JPG ou WebP.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setFileError('Arquivo muito grande. O limite e de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setImgObj(img);
        setCropZoom(CROP_ZOOM_MIN);
        setCropOffset(ZERO_OFFSET);
        setCropMode(defaultCropMode(img.naturalWidth, img.naturalHeight, targetW, targetH));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setImgObj(null);
    setBlankWarning(false);
    setPreviewUrl(null);
    setCropZoom(CROP_ZOOM_MIN);
    setCropOffset(ZERO_OFFSET);
    onCroppedChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-stone-900">
          Imagem do anúncio ({targetW}x{targetH} px)
        </label>
        {imgObj && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold"
          >
            Remover
          </button>
        )}
      </div>

      {!imgObj ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-stone-300 hover:border-purple-600 bg-stone-50 hover:bg-purple-50/30 rounded-2xl p-5 text-center cursor-pointer transition"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="text-stone-700 text-xs font-semibold">
            Clique para selecionar PNG, JPG ou WebP
          </div>
          <div className="text-stone-400 text-[11px] mt-1">Até 5MB. Será recortada na proporção {targetW}:{targetH}.</div>
        </div>
      ) : (
        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-3">
          <div className="flex flex-col items-center gap-2 p-2 bg-stone-900/5 rounded-xl overflow-hidden min-h-[90px]">
            <CropFrame previewUrl={previewUrl} targetW={targetW} targetH={targetH} onDrag={handleDrag} />
            <p className="text-[11px] text-stone-600 text-center text-pretty">
              É assim que seu anúncio vai aparecer na grade. Arraste para ajustar.
            </p>
          </div>

          <div className="flex gap-2" role="group" aria-label="Enquadramento">
            {CROP_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.mode}
                type="button"
                aria-pressed={cropMode === opt.mode}
                onClick={() => handleMode(opt.mode)}
                className={`flex-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                  cropMode === opt.mode
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-stone-300 bg-white text-stone-700 hover:border-purple-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-stone-600 font-medium">
              <span>Zoom / Enquadramento:</span>
              <span className="font-mono">{cropZoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={CROP_ZOOM_MIN}
              max={CROP_ZOOM_MAX}
              step={CROP_ZOOM_STEP}
              value={cropZoom}
              onChange={(e) => handleZoom(parseFloat(e.target.value))}
              className="w-full accent-brand-purple cursor-pointer"
            />
          </div>
        </div>
      )}

      {(fileError || error) && (
        <p className="text-[11px] text-rose-600 font-medium">{fileError || error}</p>
      )}
      {imgObj && blankWarning && (
        <p role="status" className="text-[11px] text-amber-700 font-medium text-pretty">
          Sua imagem parece vazia ou de uma cor só. Confira se o logo aparece antes de pagar.
        </p>
      )}
    </div>
  );
}
