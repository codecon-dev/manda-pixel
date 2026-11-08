import type { Metadata } from 'next';
import HomeClient from './components/HomeClient';
import { parseFocus } from './lib/focus';
import { BLOCK_SIZE } from './lib/constants';
import { isAreaAvailable } from './lib/db';
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

export default function Home({ searchParams }: HomeProps) {
  return (
    <>
      <h1 className="sr-only">Manda Pixel: 1 milhão de pixels a R$ 1 cada</h1>
      <HomeClient focus={parseFocus(searchParams.x, searchParams.y)} />
    </>
  );
}
