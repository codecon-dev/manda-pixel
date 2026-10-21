import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { getDataDir, getPublicAdById } from '@/app/lib/db';
import { isValidPublicAdId } from '@/app/lib/ad-rules';
import { UnsupportedPngError, upscalePngNearest } from '@/app/lib/png-upscale';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Anúncio no Manda Pixel';

const BRAND_PURPLE = '#6A3378';
const BRAND_YELLOW = '#FCD953';
/** Caixa maxima da imagem do anuncio dentro do card. */
const IMAGE_BOX = 380;

function readAdImage(id: string): string | null {
  if (!isValidPublicAdId(id)) return null;
  const filePath = path.join(getDataDir(), 'uploads', `${id}.png`);
  if (!fs.existsSync(filePath)) return null;
  const original = fs.readFileSync(filePath);
  let png = original;
  try {
    png = upscalePngNearest(original, IMAGE_BOX);
  } catch (err) {
    if (!(err instanceof UnsupportedPngError)) throw err;
    // formato que o ampliador nao entende: usa o original (fica suavizado, mas aparece)
  }
  return `data:image/png;base64,${png.toString('base64')}`;
}

function fitBox(w: number, h: number): { width: number; height: number } {
  const scale = IMAGE_BOX / Math.max(w, h, 1);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

export default function OpengraphImage({ params }: { params: { id: string } }) {
  const ad = getPublicAdById(params.id);
  const title = ad ? `Anúncio #${ad.number}` : 'Manda Pixel';
  const image = ad ? readAdImage(ad.orderId) : null;
  const box = ad ? fitBox(ad.w, ad.h) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 28,
          background: BRAND_PURPLE, color: BRAND_YELLOW,
        }}
      >
        {image && box && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            width={box.width}
            height={box.height}
            alt=""
            style={{ border: `8px solid ${BRAND_YELLOW}`, background: '#fff' }}
          />
        )}
        <div style={{ display: 'flex', fontSize: image ? 64 : 120, fontWeight: 800 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: image ? 32 : 44 }}>mandapixel.com.br</div>
      </div>
    ),
    size
  );
}
