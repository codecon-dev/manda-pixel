const LINK_CLASS =
  'text-brand-purple font-semibold underline underline-offset-2 hover:text-brand-purpleDark rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-purple';

type WelcomeCardProps = {
  onDismiss: () => void;
  onChooseSpace: () => void;
  /** compact: folha do mobile (texto maior para leitura, padding menor). */
  compact?: boolean;
};

export default function WelcomeCard({ onDismiss, onChooseSpace, compact = false }: WelcomeCardProps) {
  const padding = compact ? 'p-2.5 sm:p-3' : 'p-4';
  const titleSize = compact ? 'text-base sm:text-lg' : 'text-base';
  const bodySize = compact ? 'text-sm leading-snug' : 'text-xs leading-relaxed';
  const noteSize = 'text-xs leading-snug';
  const footerSpacing = compact ? 'mt-2 pt-1.5' : 'mt-3 pt-2';
  const iconVisibility = compact ? 'hidden' : 'flex';
  // compact (mobile): texto rola dentro do card, linha de botoes fica sempre visivel.
  const cardLayout = compact ? 'flex flex-col min-h-0 max-h-full' : '';
  const bodyScroll = compact ? 'min-h-0 flex-1 overflow-y-auto' : '';
  const footerShrink = compact ? 'shrink-0' : '';

  return (
    <div className={`bg-white/98 backdrop-blur-md border-2 border-brand-purple/20 shadow-xl rounded-2xl ${padding} text-stone-900 ${cardLayout}`}>
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
