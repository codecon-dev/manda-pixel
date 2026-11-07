import fs from 'node:fs';
import { ImageResponse } from 'next/og';
import { getPublicAdById } from '@/app/lib/db';
import { adUploadPath } from '@/app/lib/ad-image';
import { UnsupportedPngError, pngSize, upscalePngNearest } from '@/app/lib/png-upscale';
import { markerRect, ogIntegerScale, pixelsLabel, positionLabel } from '@/app/lib/og-layout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Anúncio no Manda Pixel';

const BRAND_PURPLE = '#6A3378';
const BRAND_YELLOW = '#FCD953';
const WHITE = '#FFFFFF';
const SOFT_WHITE = 'rgba(255,255,255,0.82)';
const PADDING = 56;
const COLUMN_GAP = 56;
const TEXT_GAP = 14;
/** Moldura do logo e area maxima da imagem ampliada (so por fator inteiro). */
const FRAME_BOX = 400;
const FRAME_BORDER = 8;
const IMAGE_BOX = 380;
const MAP_SIZE = 200;
const CACHE_HEADERS = { 'cache-control': 'public, max-age=300' };

type AdImage = { src: string; width: number; height: number };
type OgAd = { x: number; y: number; w: number; h: number; image: AdImage };

/** PNG do anuncio pre-ampliado (Satori ignora image-rendering). null se nao houver PNG legivel. */
function readAdImage(orderId: string): AdImage | null {
  const filePath = adUploadPath(orderId);
  if (!filePath) return null;
  const original = fs.readFileSync(filePath);
  try {
    const real = pngSize(original);
    const scale = ogIntegerScale(real.width, real.height, IMAGE_BOX);
    let png = original;
    try {
      png = upscalePngNearest(original, scale * Math.max(real.width, real.height));
    } catch (err) {
      if (!(err instanceof UnsupportedPngError)) throw err;
      // formato que o ampliador nao entende: usa o original no tamanho real
    }
    const { width, height } = pngSize(png);
    return { src: `data:image/png;base64,${png.toString('base64')}`, width, height };
  } catch (err) {
    if (!(err instanceof UnsupportedPngError)) throw err;
    return null;
  }
}

/** So campos publicos (posicao, tamanho, imagem). Qualquer falha cai no card generico. */
function loadOgAd(id: string): OgAd | null {
  try {
    const ad = getPublicAdById(id);
    if (!ad) return null;
    const image = readAdImage(ad.orderId);
    return image ? { x: ad.x, y: ad.y, w: ad.w, h: ad.h, image } : null;
  } catch (err) {
    console.error('[og /a/[id]] falha ao montar imagem', { id, err: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

function AdImageFrame({ image }: { image: AdImage }) {
  return (
    <div
      style={{
        display: 'flex', width: FRAME_BOX, height: FRAME_BOX, flexShrink: 0,
        alignItems: 'center', justifyContent: 'center',
        border: `${FRAME_BORDER}px solid ${BRAND_YELLOW}`, background: 'rgba(0,0,0,0.25)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} width={image.width} height={image.height} alt="" />
    </div>
  );
}

function MiniGrid({ ad }: { ad: OgAd }) {
  const r = markerRect(ad, MAP_SIZE);
  return (
    <div
      style={{
        display: 'flex', position: 'relative', width: MAP_SIZE, height: MAP_SIZE, flexShrink: 0,
        background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.35)',
      }}
    >
      <div style={{ position: 'absolute', left: r.left, top: r.top, width: r.width, height: r.height, background: BRAND_YELLOW }} />
    </div>
  );
}

function AdCard({ ad }: { ad: OgAd }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: COLUMN_GAP, width: '100%', height: '100%' }}>
      <AdImageFrame image={ad.image} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: TEXT_GAP, lineHeight: 1.1 }}>
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: BRAND_YELLOW }}>Manda Pixel</div>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: WHITE }}>{pixelsLabel(ad.w * ad.h)}</div>
        <div style={{ display: 'flex', fontSize: 32, color: WHITE }}>{positionLabel(ad.x, ad.y)}</div>
        <div style={{ display: 'flex', fontSize: 28, color: SOFT_WHITE }}>no ar pra sempre</div>
        <MiniGrid ad={ad} />
        <div style={{ display: 'flex', fontSize: 26, color: SOFT_WHITE }}>mandapixel.com.br</div>
      </div>
    </div>
  );
}

function FallbackCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, width: '100%', height: '100%' }}>
      <div style={{ display: 'flex', fontSize: 120, fontWeight: 800, color: BRAND_YELLOW }}>Manda Pixel</div>
      <div style={{ display: 'flex', fontSize: 48, color: WHITE }}>1.000.000 de pixels a R$ 1</div>
      <div style={{ display: 'flex', fontSize: 32, color: SOFT_WHITE }}>mandapixel.com.br</div>
    </div>
  );
}

export default function OpengraphImage({ params }: { params: { id: string } }) {
  const ad = loadOgAd(params.id);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', padding: PADDING, background: BRAND_PURPLE }}>
        {ad ? <AdCard ad={ad} /> : <FallbackCard />}
      </div>
    ),
    { ...size, headers: CACHE_HEADERS }
  );
}
