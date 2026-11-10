'use client';

import type { PreviewZoom } from '@/types/preview';

const ZOOM_OPTIONS: ReadonlyArray<{ value: PreviewZoom; label: string }> = [
  { value: 'perto', label: 'Perto' },
  { value: 'medio', label: 'Médio' },
  { value: 'grade', label: 'Grade inteira' },
];

const BASE_CLASS =
  'min-h-[44px] flex-1 rounded-lg px-2 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple';
const ON_CLASS = 'bg-brand-purple text-white';
const OFF_CLASS = 'border border-stone-300 bg-white text-stone-900 hover:bg-stone-100';

type PreviewZoomControlProps = {
  zoom: PreviewZoom;
  onZoom: (zoom: PreviewZoom) => void;
};

/** Seletor de zoom da previa: tres botoes com aria-pressed. */
export default function PreviewZoomControl({ zoom, onZoom }: PreviewZoomControlProps) {
  return (
    <div role="group" aria-labelledby="previa-zoom-label">
      <p id="previa-zoom-label" className="block text-sm font-semibold text-stone-900">
        Zoom
      </p>
      <div className="mt-1 flex gap-2">
        {ZOOM_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={zoom === opt.value}
            onClick={() => onZoom(opt.value)}
            className={`${BASE_CLASS} ${zoom === opt.value ? ON_CLASS : OFF_CLASS}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
