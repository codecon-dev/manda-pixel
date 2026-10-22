import fs from 'node:fs';
import { ImageResponse } from 'next/og';
import { getPublicAdById } from '@/app/lib/db';
import { adUploadPath } from '@/app/lib/ad-image';
import { UnsupportedPngError, pngSize, upscalePngNearest } from '@/app/lib/png-upscale';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Anúncio no Manda Pixel';

const BRAND_PURPLE = '#6A3378';
const BRAND_YELLOW = '#FCD953';
/** Area maxima da imagem do anuncio dentro do card (a imagem so e ampliada por fator inteiro). */
const IMAGE_BOX = 380;
const IMAGE_BORDER = 8;
const FRAME_BOX = IMAGE_BOX + 2 * IMAGE_BORDER;

type AdImage = { src: string; width: number; height: number };

function readAdImage(id: string): AdImage | null {
  const filePath = adUploadPath(id);
  if (!filePath) return null;
  const original = fs.readFileSync(filePath);
  let png = original;
  try {
    png = upscalePngNearest(original, IMAGE_BOX);
  } catch (err) {
    if (!(err instanceof UnsupportedPngError)) throw err;
    // formato que o ampliador nao entende: usa o original no tamanho real
  }
  try {
    const { width, height } = pngSize(png);
    return { src: `data:image/png;base64,${png.toString('base64')}`, width, height };
  } catch (err) {
    if (!(err instanceof UnsupportedPngError)) throw err;
    return null; // arquivo nao e PNG: card sai sem imagem
  }
}

function AdImageFrame({ image }: { image: AdImage }) {
  return (
    <div style={{ display: 'flex', width: FRAME_BOX, height: FRAME_BOX, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', border: `${IMAGE_BORDER}px solid ${BRAND_YELLOW}`, background: '#fff' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} width={image.width} height={image.height} alt="" style={{ imageRendering: 'pixelated' }} />
      </div>
    </div>
  );
}

export default function OpengraphImage({ params }: { params: { id: string } }) {
  const ad = getPublicAdById(params.id);
  const title = ad ? `Anúncio #${ad.number}` : 'Manda Pixel';
  const image = ad ? readAdImage(ad.orderId) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 28,
          background: BRAND_PURPLE, color: BRAND_YELLOW,
        }}
      >
        {image && <AdImageFrame image={image} />}
        <div style={{ display: 'flex', fontSize: image ? 64 : 120, fontWeight: 800 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: image ? 32 : 44 }}>mandapixel.com.br</div>
      </div>
    ),
    size
  );
}
