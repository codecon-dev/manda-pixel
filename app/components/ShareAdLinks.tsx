import Link from 'next/link';
import ShareOnX from '@/app/components/ShareOnX';

/** Link para a pagina publica do anuncio e botao de compartilhar no X (tela /obrigado). */
export default function ShareAdLinks({ orderId, pixels }: { orderId: string; pixels: number }) {
  return (
    <div className="mt-3 flex flex-col gap-3">
      <ShareOnX adId={orderId} pixels={pixels} variant="comprador" className="w-full" />
      <Link
        href={`/a/${encodeURIComponent(orderId)}`}
        className="text-center text-xs font-bold text-purple-900 hover:underline"
      >
        Ver a página do seu anúncio
      </Link>
    </div>
  );
}
