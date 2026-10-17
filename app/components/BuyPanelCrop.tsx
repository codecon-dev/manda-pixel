'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cropScale } from '../lib/crop-scale.ts';

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
  const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const generateCrop = useCallback(
    (img: HTMLImageElement, zoom: number, offX: number, offY: number, tw: number, th: number) => {
      // Guarda S px de imagem por pixel do bloco para o anúncio não ficar borrado ao ampliar
      const S = cropScale(tw, th);
      const canvas = document.createElement('canvas');
      canvas.width = tw * S;
      canvas.height = th * S;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(S, S);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const imgAspect = img.naturalWidth / img.naturalHeight;
      const blockAspect = tw / th;

      let baseW = tw;
      let baseH = th;
      if (imgAspect > blockAspect) {
        baseW = th * imgAspect;
      } else {
        baseH = tw / imgAspect;
      }

      const drawW = baseW * zoom;
      const drawH = baseH * zoom;
      const posX = (tw - drawW) / 2 + offX;
      const posY = (th - drawH) / 2 + offY;

      ctx.drawImage(img, posX, posY, drawW, drawH);
      const dataUrl = canvas.toDataURL('image/png');
      onCroppedChange(dataUrl);
    },
    [onCroppedChange]
  );

  useEffect(() => {
    if (!imgObj) return;
    generateCrop(imgObj, cropZoom, cropOffset.x, cropOffset.y, targetW, targetH);
  }, [imgObj, cropZoom, cropOffset, targetW, targetH, generateCrop]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setFileError('Formato invalido. Envie imagem PNG, JPG ou WebP.');
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
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setImgObj(null);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    onCroppedChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-stone-900">
          Imagem do anuncio ({targetW}x{targetH} px)
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
          <div className="text-stone-400 text-[11px] mt-1">Ate 5MB. Sera recortada na proporcao {targetW}:{targetH}.</div>
        </div>
      ) : (
        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-3">
          <div className="flex items-center justify-center p-2 bg-stone-900/5 rounded-xl overflow-hidden min-h-[90px]">
            <div
              style={{
                width: `${Math.min(180, Math.max(60, targetW * 1.5))}px`,
                aspectRatio: `${targetW} / ${targetH}`,
              }}
              className="relative border border-purple-400 bg-white rounded shadow-inner overflow-hidden flex items-center justify-center"
            >
              <img
                src={imgObj.src}
                alt="Preview de corte"
                style={{
                  transform: `scale(${cropZoom}) translate(${cropOffset.x}px, ${cropOffset.y}px)`,
                  transformOrigin: 'center center',
                }}
                className="max-w-full max-h-full object-contain pointer-events-none transition-transform"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-stone-600 font-medium">
              <span>Zoom / Enquadramento:</span>
              <span className="font-mono">{cropZoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={cropZoom}
              onChange={(e) => setCropZoom(parseFloat(e.target.value))}
              className="w-full accent-purple-800 cursor-pointer"
            />
          </div>
        </div>
      )}

      {(fileError || error) && (
        <p className="text-[11px] text-rose-600 font-medium">{fileError || error}</p>
      )}
    </div>
  );
}
