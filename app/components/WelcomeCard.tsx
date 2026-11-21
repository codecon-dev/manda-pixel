const LINK_CLASS =
  'text-brand-purple font-semibold underline underline-offset-2 hover:text-brand-purpleDark rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-purple';

type WelcomeCardProps = {
  onDismiss: () => void;
  onChooseSpace: () => void;
  /** compact: banner curto do mobile (titulo, 2 linhas, Escolher espaco e fechar). */
  compact?: boolean;
};

/** Banner curto do mobile: titulo em 1 linha, ate 2 linhas de texto, CTA e fechar sempre visiveis (sem scroll). */
function CompactWelcome({ onDismiss, onChooseSpace }: Omit<WelcomeCardProps, 'compact'>) {
  return (
    <div className="bg-white border-2 border-brand-purple/20 shadow-md rounded-2xl p-3 text-stone-900 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <h2 className="min-w-0 truncate text-sm font-pixel text-stone-950 leading-tight">Bem-vindo ao Manda Pixel</h2>
        <button
          onClick={onDismiss}
          className="shrink-0 text-stone-700 hover:text-stone-900 font-bold text-sm p-1 rounded-lg hover:bg-stone-100 transition leading-none"
          aria-label="Fechar mensagem de boas-vindas"
        >
          ✕
        </button>
      </div>
      <p className="text-sm leading-snug text-stone-900 line-clamp-2 text-pretty">
        1 milhão de pixels a R$ 1. Escolha o lugar e seu logo fica pra sempre.
      </p>
      <div className="mt-1 flex justify-end shrink-0">
        <button
          onClick={onChooseSpace}
          className="shrink-0 px-3.5 py-2 rounded-xl bg-brand-purple hover:bg-brand-purpleDark text-white text-xs font-bold transition shadow-sm"
        >
          Escolher espaço
        </button>
      </div>
    </div>
  );
}

export default function WelcomeCard({ onDismiss, onChooseSpace, compact = false }: WelcomeCardProps) {
  if (compact) return <CompactWelcome onDismiss={onDismiss} onChooseSpace={onChooseSpace} />;
  const padding = 'p-4';
  const titleSize = 'text-base';
  const bodySize = 'text-xs leading-relaxed';
  const noteSize = 'text-xs leading-snug';
  const footerSpacing = 'mt-3 pt-2';
  const iconVisibility = 'flex';
  const cardLayout = '';
  const bodyScroll = '';
  const footerShrink = '';

  return (
    <div className={`bg-white border-2 border-brand-purple/20 shadow-md rounded-2xl ${padding} text-stone-900 ${cardLayout}`}>
      <div className={`flex items-start justify-between gap-3 ${bodyScroll}`}>
        <div className="flex gap-3">
          <div className={`${iconVisibility} w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 text-brand-purple items-center justify-center shrink-0 font-bold text-base`}>
            🚀
          </div>
          <div>
            <h2 className={`${titleSize} font-pixel text-stone-950 leading-tight text-balance`}>
              Bem-vindo ao Manda Pixel
            </h2>
            <p className={`${bodySize} text-stone-900 mt-1 text-pretty`}>
              Uma IA opera este site por 1 ano, com uma meta meio absurda: R$ 1 milhão vendendo pixels a R$ 1 cada. Escolha um espaço livre, publique sua imagem com link e ela fica no ar para sempre.
            </p>
            <p className={`${noteSize} text-stone-900 font-medium mt-1 text-pretty`}>
              Tudo que a IA decide vai pro{' '}
              <a href="/diario" className={LINK_CLASS}>
                Diário
              </a>
              . O código é aberto no{' '}
              <a
                href="https://github.com/codecon-dev/manda-pixel"
                target="_blank"
                rel="noopener noreferrer"
                className={LINK_CLASS}
              >
                GitHub
              </a>
              .
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-stone-700 hover:text-stone-900 font-bold text-sm p-1 rounded-lg hover:bg-stone-100 transition leading-none shrink-0"
          aria-label="Fechar mensagem de boas-vindas"
        >
          ✕
        </button>
      </div>

      <div className={`${footerSpacing} flex items-center justify-end gap-2 border-t border-stone-200 ${footerShrink}`}>
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 text-xs font-semibold transition"
        >
          Fechar
        </button>
        <button
          onClick={onChooseSpace}
          className="px-3.5 py-1.5 rounded-xl bg-brand-purple hover:bg-brand-purpleDark text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
        >
          <span>Escolher espaço no centro</span>
          <span className="text-brand-yellow font-extrabold">→</span>
        </button>
      </div>
      <p className={`mt-1.5 text-right text-xs leading-snug ${footerShrink}`}>
        <a href="/previa" className={LINK_CLASS}>
          Ver meu logo na grade antes de comprar
        </a>
      </p>
    </div>
  );
}
