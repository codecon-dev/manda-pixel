import { NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';
import { getGridState, isAreaAvailable } from '@/app/lib/db';
import { BLOCK_SIZE } from '@/app/lib/constants';
import { parseFocus } from '@/app/lib/focus';
import { markerRect } from '@/app/lib/og-layout';
import { positionHeading, snapToBlock } from '@/app/lib/position-share';
import type { MarkerRect } from '@/app/lib/og-layout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIZE = { width: 1200, height: 630 };
const BRAND_PURPLE = '#6A3378';
const BRAND_YELLOW = '#FCD953';
const WHITE = '#FFFFFF';
const SOFT_WHITE = 'rgba(255,255,255,0.82)';
const MAP_BG = '#F5F5F4';
const AD_COLOR = '#44403C';
const PADDING = 55;
const COLUMN_GAP = 56;
const TEXT_GAP = 18;
const MAP_SIZE = 520;
/** Satori fica lento com milhares de nos: desenha no maximo isto de anuncios. */
const MAX_DRAWN_BLOCKS = 2000;
const MARKER_MIN = 18;
const CACHE_HEADERS = { 'cache-control': 'public, max-age=300' };

type OgPositionData = { ads: MarkerRect[]; livre: boolean | null };

/** Anuncios (mesma fonte de /api/grid) e status do bloco 5x5. Falha de banco vira mapa vazio e status desconhecido. */
function loadPositionData(x: number, y: number): OgPositionData {
  try {
    const { blocks } = getGridState();
    const ads = blocks
      .filter((b) => b.state !== 'reserved')
      .slice(0, MAX_DRAWN_BLOCKS)
      .map((b) => markerRect(b, MAP_SIZE, 1));
    const livre = isAreaAvailable(snapToBlock(x), snapToBlock(y), BLOCK_SIZE, BLOCK_SIZE);
    return { ads, livre };
  } catch (err) {
    console.error('[og /og/posicao] falha ao ler a grade', { x, y, err: err instanceof Error ? err.message : String(err) });
    return { ads: [], livre: null };
  }
}

function statusLabel(livre: boolean | null): string {
  if (livre === true) return 'Ainda livre';
  if (livre === false) return 'Já ocupado';
  return 'Um lugar na grade';
}

function MiniGrid({ ads, marker }: { ads: MarkerRect[]; marker: MarkerRect }) {
  return (
    <div style={{ display: 'flex', position: 'relative', width: MAP_SIZE, height: MAP_SIZE, flexShrink: 0, background: MAP_BG }}>
      {ads.map((r, i) => (
        <div key={i} style={{ position: 'absolute', left: r.left, top: r.top, width: r.width, height: r.height, background: AD_COLOR }} />
      ))}
      <div
        style={{
          position: 'absolute', left: marker.left, top: marker.top, width: marker.width, height: marker.height,
          background: BRAND_YELLOW, border: `3px solid ${BRAND_PURPLE}`,
        }}
      />
    </div>
  );
}

function PositionCard({ x, y, data }: { x: number; y: number; data: OgPositionData }) {
  const marker = markerRect({ x: snapToBlock(x), y: snapToBlock(y), w: BLOCK_SIZE, h: BLOCK_SIZE }, MAP_SIZE, MARKER_MIN);
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: COLUMN_GAP, width: '100%', height: '100%' }}>
      <MiniGrid ads={data.ads} marker={marker} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: TEXT_GAP, lineHeight: 1.15 }}>
        <div style={{ display: 'flex', fontSize: 28, color: BRAND_YELLOW }}>Manda Pixel</div>
        <div style={{ display: 'flex', fontSize: 52, color: WHITE }}>{positionHeading(x, y)}</div>
        <div style={{ display: 'flex', fontSize: 40, color: BRAND_YELLOW }}>{statusLabel(data.livre)}</div>
        <div style={{ display: 'flex', fontSize: 28, color: SOFT_WHITE }}>R$ 1 por pixel · o anúncio fica pra sempre</div>
        <div style={{ display: 'flex', fontSize: 26, color: SOFT_WHITE }}>mandapixel.com.br</div>
      </div>
    </div>
  );
}

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const focus = parseFocus(params.get('x') ?? undefined, params.get('y') ?? undefined);
  if (!focus) {
    return NextResponse.json({ error: 'x e y precisam ser inteiros de 0 a 999' }, { status: 400 });
  }
  const data = loadPositionData(focus.x, focus.y);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', padding: PADDING, background: BRAND_PURPLE }}>
        <PositionCard x={focus.x} y={focus.y} data={data} />
      </div>
    ),
    { ...SIZE, headers: CACHE_HEADERS }
  );
}
