'use client';

import type { ChangeEvent } from 'react';
import Link from 'next/link';
import { GRID_MAX_COORD, PREVIEW_SIZES } from '@/app/lib/constants';
import { pixelsLabel, priceLabel } from '@/app/lib/logo-preview';

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp,image/svg+xml';
const FIELD_CLASS =
  'mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-950 tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-purple';
const LABEL_CLASS = 'block text-sm font-semibold text-stone-900';

type LogoPreviewControlsProps = {
  xText: string;
  yText: string;
  size: number;
  fileError: string | null;
  fileName: string | null;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
  onX: (v: string) => void;
  onY: (v: string) => void;
  onSize: (v: number) => void;
};

export default function LogoPreviewControls(props: LogoPreviewControlsProps) {
  const pixels = props.size * props.size;
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="previa-logo" className={LABEL_CLASS}>
          Escolha a imagem do seu logo
        </label>
        <input
          id="previa-logo"
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={props.onFile}
          className="peer sr-only"
        />
        <div className="mt-1 flex min-w-0 items-center gap-3 rounded-lg peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-purple">
          <label
            htmlFor="previa-logo"
            className="shrink-0 cursor-pointer rounded-lg bg-brand-purple px-3 py-2 text-sm font-semibold text-white hover:bg-brand-purpleDark"
          >
            Escolher imagem
          </label>
          <span className="truncate text-sm text-stone-700">{props.fileName ?? 'Nenhuma ainda'}</span>
        </div>
        <p className="mt-1 text-sm text-stone-700 text-pretty">A imagem fica só no seu navegador. Nada é enviado.</p>
        {props.fileError && (
          <p role="alert" className="mt-1 text-sm font-semibold text-red-700">
            {props.fileError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="previa-x" className={LABEL_CLASS}>X</label>
          <input
            id="previa-x"
            type="number"
            inputMode="numeric"
            min={0}
            max={GRID_MAX_COORD}
            value={props.xText}
            onChange={(e) => props.onX(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="previa-y" className={LABEL_CLASS}>Y</label>
          <input
            id="previa-y"
            type="number"
            inputMode="numeric"
            min={0}
            max={GRID_MAX_COORD}
            value={props.yText}
            onChange={(e) => props.onY(e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label htmlFor="previa-tamanho" className={LABEL_CLASS}>Tamanho</label>
          <select
            id="previa-tamanho"
            value={props.size}
            onChange={(e) => props.onSize(Number(e.target.value))}
            className={FIELD_CLASS}
          >
            {PREVIEW_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}x{s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-base font-semibold text-stone-950 tabular-nums">
        {pixelsLabel(pixels)} pixels = {priceLabel(pixels)}
      </p>
    </div>
  );
}

const BUTTON_CLASS =
  'rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple';

type LogoPreviewActionsProps = {
  notice: string | null;
  buyHref: string;
  onDownload: () => void;
  onShare: () => void;
  onBuy: () => void;
};

export function LogoPreviewActions(props: LogoPreviewActionsProps) {
  return (
    <>
      {props.notice && (
        <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          {props.notice}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={props.onDownload} className={BUTTON_CLASS}>
          Baixar imagem
        </button>
        <button type="button" onClick={props.onShare} className={BUTTON_CLASS}>
          Compartilhar
        </button>
      </div>
      <Link
        href={props.buyHref}
        onClick={props.onBuy}
        className="block w-full rounded-xl bg-brand-yellow px-4 py-3 text-center font-bold text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
      >
        Comprar esse lugar
      </Link>
    </>
  );
}
