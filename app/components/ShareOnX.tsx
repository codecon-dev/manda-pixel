import { buildShareUrl } from '@/app/lib/share';
import type { ShareVariant } from '@/types/share';

type ShareOnXProps = {
  adId: string;
  pixels: number;
  variant: ShareVariant;
  className?: string;
};

/** Botão secundário que abre o compositor do X com o link público do anúncio. */
export default function ShareOnX({ adId, pixels, variant, className = '' }: ShareOnXProps) {
  return (
    <a
      href={buildShareUrl({ adId, pixels, variant })}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Compartilhar este anúncio no X, abre em nova aba"
      className={`inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[#6A3378] bg-white px-5 py-2.5 text-center text-sm font-bold text-[#6A3378] transition-colors hover:bg-[#FCD953] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FCD953] ${className}`}
    >
      Compartilhar no X
    </a>
  );
}
