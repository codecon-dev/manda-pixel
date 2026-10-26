'use client';

import { useRef, useState } from 'react';
import { BADGE_ALT, BADGE_HEIGHT, BADGE_PATH, BADGE_WIDTH, buildBadgeHtml } from '@/app/lib/badge';

const COPIED_FEEDBACK_MS = 2000;

type BadgeEmbedProps = { adId: string };

/** Prévia do selo + código HTML para quem anunciou colar no próprio site. */
export default function BadgeEmbed({ adId }: BadgeEmbedProps) {
  const html = buildBadgeHtml(adId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  function selectCode() {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // sem permissao de clipboard (http, navegador antigo): deixa o texto selecionado para Ctrl+C
      selectCode();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BADGE_PATH} alt={BADGE_ALT} width={BADGE_WIDTH} height={BADGE_HEIGHT} className="rounded-md ring-1 ring-white/40" />
      <label htmlFor="badge-code" className="text-sm text-white/90">
        Código para colar no HTML do seu site
      </label>
      <textarea
        id="badge-code"
        ref={textareaRef}
        readOnly
        rows={6}
        value={html}
        onFocus={selectCode}
        className="h-40 w-full resize-none break-all rounded-lg leading-relaxed sm:h-24 bg-white/10 p-3 font-mono text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FCD953]"
      />
      <button
        type="button"
        onClick={copyCode}
        className="inline-flex min-h-11 items-center justify-center self-start rounded-xl border-2 border-[#6A3378] bg-white px-5 py-2.5 text-center text-sm font-bold text-[#6A3378] transition-colors hover:bg-[#FCD953] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FCD953]"
      >
        <span aria-live="polite">{copied ? 'Copiado' : 'Copiar código'}</span>
      </button>
    </div>
  );
}
