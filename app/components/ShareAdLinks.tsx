import Link from 'next/link';
import { SITE_URL } from '@/app/lib/constants';

const SHARE_TEXT = 'Comprei meu pedaço do Manda Pixel, 1 milhão de pixels a R$ 1 cada. Fica lá pra sempre:';

/** Link para a pagina publica do anuncio e botao de compartilhar no X (tela /obrigado). */
export default function ShareAdLinks({ orderId }: { orderId: string }) {
  const adUrl = `${SITE_URL}/a/${encodeURIComponent(orderId)}`;
  const tweetUrl =
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(adUrl)}`;

  return (
    <div className="mt-3 flex flex-col gap-3">
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener"
        className="w-full py-3 rounded-2xl bg-[#FCD953] hover:bg-yellow-200 text-stone-950 font-bold text-xs transition flex items-center justify-center"
      >
        Compartilhar no X
      </a>
      <Link
        href={`/a/${encodeURIComponent(orderId)}`}
        className="text-center text-xs font-bold text-purple-900 hover:underline"
      >
        Ver a página do seu anúncio
      </Link>
    </div>
  );
}
