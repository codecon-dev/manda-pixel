import { NextResponse } from 'next/server';
import { getGridState } from '@/app/lib/db';
import { syncGatewayOrders } from '@/app/lib/gateway-sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Sincroniza em segundo plano / com throttle curto sem travar a resposta
    await syncGatewayOrders().catch(() => {});

    const data = getGridState();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
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
