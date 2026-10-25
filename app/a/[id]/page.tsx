import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicAdById } from '@/app/lib/db';
import { AD_DESCRIPTION_MAX, AD_PAGE_IMAGE_MAX, SITE_URL } from '@/app/lib/constants';
import { adImageSize } from '@/app/lib/ad-image';
import { integerScale } from '@/app/lib/png-upscale';
import type { PublicAd } from '@/types/ads';
import ShareOnX from '@/app/components/ShareOnX';

export const dynamic = 'force-dynamic';

type AdPageProps = { params: { id: string } };

const X_HANDLE_PATTERN = /^[A-Za-z0-9_]{1,15}$/;

function cut(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function safeHttpUrl(url: string | null): URL | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed : null;
  } catch {
    return null; // link malformado: a página mostra o anúncio sem o link
  }
}

function formatPaidAt(paidAt: string | null): string | null {
  if (!paidAt) return null;
  const date = new Date(paidAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  });
}

export function generateMetadata({ params }: AdPageProps): Metadata {
  const ad = getPublicAdById(params.id);
  if (!ad) return { title: 'Anúncio não encontrado no Manda Pixel', robots: { index: false } };
  const title = `Anúncio #${ad.number} no Manda Pixel`;
  const description = ad.altText
    ? cut(ad.altText, AD_DESCRIPTION_MAX)
    : `${ad.pixels.toLocaleString('pt-BR')} pixels comprados a R$ 1 cada na grade do Manda Pixel.`;
  const url = `${SITE_URL}/a/${ad.orderId}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article', siteName: 'Manda Pixel' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function AdDetails({ ad }: { ad: PublicAd }) {
  const paidAt = formatPaidAt(ad.paidAt);
  return (
    <dl className="grid grid-cols-3 gap-3 border-t border-white/20 pt-5 text-sm">
      <div>
        <dt className="text-white/70">Posição</dt>
        <dd className="font-bold tabular-nums">{ad.x},{ad.y}</dd>
      </div>
      <div>
        <dt className="text-white/70">Tamanho</dt>
        <dd className="font-bold tabular-nums">{ad.w}×{ad.h} px</dd>
      </div>
      {paidAt && (
        <div>
          <dt className="text-white/70">Pago em</dt>
          <dd className="font-bold">{paidAt}</dd>
        </div>
      )}
    </dl>
  );
}

function AdLinks({ ad }: { ad: PublicAd }) {
  const link = safeHttpUrl(ad.linkUrl);
  const handle = ad.xHandle?.replace(/^@/, '') ?? '';
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {link && (
        <a
          href={link.toString()}
          target="_blank"
          rel="sponsored noopener"
          className="font-bold text-[#FCD953] underline underline-offset-4 break-all"
        >
          {link.hostname.replace(/^www\./, '')}
        </a>
      )}
      {X_HANDLE_PATTERN.test(handle) && (
        <a href={`https://x.com/${handle}`} target="_blank" rel="noopener" className="text-white/90 hover:underline">
          @{handle}
        </a>
      )}
    </div>
  );
}

export default function AdPage({ params }: AdPageProps) {
  const ad = getPublicAdById(params.id);
  if (!ad) notFound();
  const focusX = Math.floor(ad.x + ad.w / 2);
  const focusY = Math.floor(ad.y + ad.h / 2);
  const natural = adImageSize(ad.orderId, { width: ad.w, height: ad.h });
  const scale = integerScale(natural.width, natural.height, AD_PAGE_IMAGE_MAX);

  return (
    <main className="min-h-dvh bg-[#6A3378] px-4 py-8 text-white sm:py-14">
      <article className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <Link href="/" className="text-sm font-bold text-[#FCD953] hover:underline">
          Manda Pixel
        </Link>
        <h1 className="text-5xl font-black text-balance tabular-nums sm:text-6xl">Anúncio #{ad.number}</h1>

        {ad.imagePath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ad.imagePath}
            alt={ad.altText ?? `Anúncio #${ad.number}`}
            width={natural.width * scale}
            height={natural.height * scale}
            className="h-auto max-w-full rounded-sm bg-white shadow-lg ring-4 ring-[#FCD953]"
            style={{ imageRendering: 'pixelated' }}
          />
        )}

        {ad.altText && <p className="text-xl font-semibold text-pretty">{ad.altText}</p>}
        <AdLinks ad={ad} />
        {/* getPublicAdById so devolve anuncio no ar (LIVE_AD_SQL, mesmo criterio de isLiveRow) */}
        <ShareOnX adId={ad.orderId} pixels={ad.pixels} variant="visitante" className="self-start" />
        <AdDetails ad={ad} />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/?x=${focusX}&y=${focusY}`}
            className="rounded-xl bg-[#FCD953] px-5 py-3 text-center font-bold text-[#3d1d46] hover:bg-yellow-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Ver na grade
          </Link>
          <Link
            href="/"
            className="rounded-xl border-2 border-white/80 px-5 py-3 text-center font-bold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Compre o seu pedaço
          </Link>
        </div>
        <p className="text-sm text-white/70 text-pretty">
          1 milhão de pixels a R$ 1 cada, em blocos a partir de 5×5. Quem compra fica na grade.
        </p>
      </article>
    </main>
  );
}
