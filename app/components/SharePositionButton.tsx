'use client';

import { useEffect, useState } from 'react';
import { SITE_URL } from '@/app/lib/constants';
import { positionSharePath } from '@/app/lib/position-share';
import { trackSharePosicao } from '@/app/lib/analytics';

const COPIED_FEEDBACK_MS = 2000;

/** Compartilha o link /?x=&y= do bloco selecionado: share nativo ou copia para a area de transferencia. */
export default function SharePositionButton({ x, y }: { x: number; y: number }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [copied]);

  const handleShare = async () => {
    trackSharePosicao({ x, y });
    const url = `${SITE_URL}${positionSharePath(x, y)}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ url });
      } catch (err) {
        // cancelar a janela de compartilhamento lanca AbortError: nao e falha
        if (!(err instanceof DOMException && err.name === 'AbortError')) throw err;
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Compartilhar lugar"
      title="Compartilhar lugar"
      className="min-h-10 min-w-10 px-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
    >
      <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <line x1="8.2" y1="10.8" x2="15.8" y2="6.2" />
        <line x1="8.2" y1="13.2" x2="15.8" y2="17.8" />
      </svg>
      {copied ? (
        <span role="status">Link copiado</span>
      ) : (
        <span className="hidden sm:inline">Compartilhar lugar</span>
      )}
    </button>
  );
}
