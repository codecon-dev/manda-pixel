import type { Metadata } from 'next';
import HomeClient from './components/HomeClient';
import { parseFocus } from './lib/focus';
import { BLOCK_SIZE, SITE_URL } from './lib/constants';
import { isAreaAvailable } from './lib/db';
import { loadAdvertisers } from './lib/advertisers-data';
import { HOME_ADVERTISERS_LIMIT } from './lib/advertisers';
import type { Advertiser } from '@/types/advertisers';
import {
  positionMetaDescription,
  positionMetaTitle,
  positionOgPath,
  snapToBlock,
} from './lib/position-share';

type HomeProps = {
  searchParams: { [key: string]: string | string[] | undefined };
};

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/** Status do bloco 5x5 da posicao; null se o banco nao responder (a metadata nao pode derrubar a pagina). */
function positionStatus(x: number, y: number): boolean | null {
  try {
    return isAreaAvailable(snapToBlock(x), snapToBlock(y), BLOCK_SIZE, BLOCK_SIZE);
  } catch (err) {
    console.error('[home generateMetadata] falha ao consultar posicao', { x, y, err: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/** Com ?x=&y= validos, o link compartilhado mostra a posicao; sem eles fica a metadata do layout. */
export function generateMetadata({ searchParams }: HomeProps): Metadata {
  const focus = parseFocus(searchParams.x, searchParams.y);
  if (!focus) return {};
  const title = positionMetaTitle(focus.x, focus.y);
  const description = positionMetaDescription(positionStatus(focus.x, focus.y));
  const ogImage = positionOgPath(focus.x, focus.y);
  return {
    title: { absolute: title },
    description,
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      siteName: 'Manda Pixel',
      // Sem og:url: o Next 14 reduz "/?x=&y=" a so a origem, e og:url da home faria o preview cair no card generico.
      title,
      description,
      images: [{ url: ogImage, width: OG_WIDTH, height: OG_HEIGHT }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
    alternates: { canonical: '/' },
  };
}

/** Lista para o HTML do servidor; banco fora do ar vira lista vazia (a home nunca quebra). */
function homeAdvertisers(): Advertiser[] {
  try {
    return loadAdvertisers().slice(0, HOME_ADVERTISERS_LIMIT);
  } catch (err) {
    console.error('[home] falha ao listar anunciantes', { err: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

const SITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: 'Manda Pixel', url: `${SITE_URL}/` },
    { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: 'Manda Pixel', url: `${SITE_URL}/`, logo: `${SITE_URL}/icon.png` },
  ],
};

/** Alternativa em texto ao canvas: o que o leitor de tela e o buscador leem. */
function AdvertisersSection({ advertisers }: { advertisers: Advertiser[] }) {
  return (
    <section aria-label="Anunciantes" className="sr-only">
      <p>Uma grade de 1 milhão de pixels a R$ 1 cada. Quem compra escolhe o lugar e o anúncio fica pra sempre.</p>
      {advertisers.length > 0 && (
        <ol>
          {advertisers.map((ad) => (
            <li key={ad.id}>
              <a href={ad.href}>{ad.name}</a>
              {ad.domain && <span> ({ad.domain})</span>}
            </li>
          ))}
        </ol>
      )}
      <a href="/anunciantes">Ver todos os anunciantes</a>
      <ul>
        <li><a href="/como-funciona">Como funciona</a></li>
        <li><a href="/anunciantes">Anunciantes</a></li>
      </ul>
    </section>
  );
}

export default function Home({ searchParams }: HomeProps) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD).replace(/</g, '\\u003c') }} />
      <h1 className="sr-only">Manda Pixel: 1 milhão de pixels a R$ 1 cada</h1>
      <AdvertisersSection advertisers={homeAdvertisers()} />
      <HomeClient focus={parseFocus(searchParams.x, searchParams.y)} />
    </>
  );
}
