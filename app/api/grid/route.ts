import { NextResponse } from 'next/server';
import { getGridState } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = getGridState();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Erro ao buscar estado da grade:', error);
    return NextResponse.json(
      {
        blocks: [],
        stats: {
          totalPixels: 1000000,
          soldPixels: 0,
          reservedPixels: 0,
          availablePixels: 1000000,
          occupiedBlocksCount: 0,
        },
        updatedAt: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
