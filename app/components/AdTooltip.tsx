'use client';

import React, { useState } from 'react';
import type { GridBlock } from '../lib/db';
import { AD_CARD_IMAGE_MAX, SMOOTH_MIN_SCALE } from '../lib/constants.ts';

export interface AdTooltipTarget {
  block: GridBlock;
  screenX: number;
  screenY: number;
}

interface AdTooltipProps extends AdTooltipTarget {
  domain: string;
  /** Card fixo aberto por toque: clicável, com "Visitar site" e botão de fechar. */
  pinned?: boolean;
  onClose?: () => void;
}

const CARD_HALF_WIDTH = 110;
// Altura aproximada do card fixo (imagem de 160 px + texto + botão), para não sair pelo topo
const CARD_MIN_TOP = 280;

function AdImage({ block }: { block: GridBlock }) {
  const [pixelated, setPixelated] = useState(false);
  if (!block.imageUrl) return null;
  const scale = AD_CARD_IMAGE_MAX / Math.max(block.w, block.h);
  return (
    <img
      src={block.imageUrl}
      alt={block.altText || 'Anúncio publicado'}
      width={Math.round(block.w * scale)}
      height={Math.round(block.h * scale)}
      onLoad={(e) => setPixelated(e.currentTarget.naturalWidth < block.w * SMOOTH_MIN_SCALE)}
      style={{ imageRendering: pixelated ? 'pixelated' : 'auto' }}
      className="max-w-[160px] max-h-[160px] object-contain rounded-md bg-white"
    />
  );
}

function PublishedContent({ block, domain, pinned }: { block: GridBlock; domain: string; pinned: boolean }) {
  return (
    <div className="space-y-1.5">
      <AdImage block={block} />
      <div className="flex items-center gap-1.5 font-bold text-amber-300">
        <span className="text-balance">{block.altText || 'Anúncio publicado'}</span>
        {block.xHandle && (
          <span className="text-stone-400 font-normal">@{block.xHandle.replace(/^@/, '')}</span>
        )}
      </div>
      {block.linkUrl && (
        <div className="text-[11px] text-stone-300 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="truncate">{domain}</span>
          {!pinned && <span className="text-[10px] text-stone-400">• Clique para abrir</span>}
        </div>
      )}
      {pinned && block.linkUrl && (
        <a
          href={block.linkUrl}
          target="_blank"
          rel="sponsored noopener noreferrer nofollow"
          className="block w-full text-center bg-amber-300 text-stone-950 font-bold rounded-lg px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200"
        >
          Visitar site
        </a>
      )}
    </div>
  );
}

export default function AdTooltip({ block, screenX, screenY, domain, pinned = false, onClose }: AdTooltipProps) {
  const left =
    pinned && typeof window !== 'undefined'
      ? Math.min(window.innerWidth - CARD_HALF_WIDTH, Math.max(CARD_HALF_WIDTH, screenX))
      : screenX;
  return (
    <div
      className={`${pinned ? 'pointer-events-auto pr-8' : 'pointer-events-none'} fixed z-30 max-w-xs -translate-x-1/2 -translate-y-full mb-3 px-3 py-2 bg-stone-950 text-white text-xs rounded-xl shadow-xl border border-stone-700 animate-in fade-in zoom-in-95`}
      style={{ left: `${left}px`, top: `${pinned ? Math.max(screenY - 8, CARD_MIN_TOP) : screenY - 8}px` }}
    >
      {pinned && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar anúncio"
          className="absolute top-1 right-1 size-7 flex items-center justify-center rounded-full text-stone-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}

      {block.state === 'published' && <PublishedContent block={block} domain={domain} pinned={pinned} />}

      {block.state === 'in_review' && (
        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Vendido • Em análise</span>
        </div>
      )}

      {block.state === 'reserved' && (
        <div className="flex items-center gap-1.5 text-purple-300 font-bold">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span>Reservado (aguardando pagamento)</span>
        </div>
      )}
    </div>
  );
}
