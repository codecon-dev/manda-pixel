import { ImageResponse } from 'next/og';
import { unstable_noStore as noStore } from 'next/cache';
import { getGridState } from '@/app/lib/db';
import { EXPERIMENT_DAYS, EXPERIMENT_START, TOTAL_PIXELS } from '@/app/lib/constants';
import { experimentStatus, formatPixels } from '@/app/lib/experiment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Manda Pixel: 1 milhão de pixels a R$ 1 cada, placar ao vivo';

const BRAND_PURPLE = '#6A3378';
const BRAND_YELLOW = '#FCD953';
const TEXT_LIGHT = '#FFFFFF';
const PADDING = 72;
const BAR_WIDTH = size.width - 2 * PADDING;
const BAR_HEIGHT = 28;
const BAR_MIN_FILL = 8;
// chave minúscula: o ImageResponse define 'cache-control' (1 ano, imutável) e só o mesmo nome sobrescreve
const CACHE_HEADERS = { 'cache-control': 'public, max-age=300' };

function readSoldPixels(): number | null {
  try {
    return getGridState().stats.soldPixels;
  } catch (err) {
    console.error('[opengraph-image] placar indisponível, imagem sai sem número', err);
    return null;
  }
}

function startLabel(): string {
  const [year, month, day] = EXPERIMENT_START.split('-');
  return `${day}/${month}/${year}`;
}

function footerText(now: Date): string {
  const status = experimentStatus(now);
  if (!status.started) return `O experimento começa em ${startLabel()}`;
  return `Dia ${status.day} de ${EXPERIMENT_DAYS}`;
}

function Scoreboard({ soldPixels }: { soldPixels: number }) {
  const ratio = Math.min(1, Math.max(0, soldPixels / TOTAL_PIXELS));
  const fill = Math.max(BAR_MIN_FILL, Math.round(BAR_WIDTH * ratio));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', fontSize: 56, fontWeight: 800, color: TEXT_LIGHT }}>
        {`${formatPixels(soldPixels)} de ${formatPixels(TOTAL_PIXELS)} pixels vendidos`}
      </div>
      <div style={{ display: 'flex', width: BAR_WIDTH, height: BAR_HEIGHT, background: 'rgba(255,255,255,0.2)' }}>
        <div style={{ display: 'flex', width: fill, height: BAR_HEIGHT, background: BRAND_YELLOW }} />
      </div>
    </div>
  );
}

export default function OpengraphImage() {
  // Next 14.2 ignora `dynamic` em rota de imagem sem params: noStore força render a cada pedido
  noStore();
  const soldPixels = readSoldPixels();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: PADDING,
          background: BRAND_PURPLE, color: TEXT_LIGHT,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', fontSize: 96, fontWeight: 800, color: BRAND_YELLOW }}>Manda Pixel</div>
          <div style={{ display: 'flex', fontSize: 34 }}>1 milhão de pixels a R$ 1 cada. O anúncio fica pra sempre.</div>
        </div>
        {soldPixels !== null && <Scoreboard soldPixels={soldPixels} />}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 32 }}>
          <div style={{ display: 'flex' }}>{footerText(new Date())}</div>
          <div style={{ display: 'flex', color: BRAND_YELLOW }}>mandapixel.com.br</div>
        </div>
      </div>
    ),
    { ...size, headers: CACHE_HEADERS }
  );
}
