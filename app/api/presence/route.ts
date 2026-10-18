import { NextResponse } from 'next/server';
import { cleanExpiredPresence } from '@/app/lib/presence';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const map = cleanExpiredPresence();

  if (clientId && typeof clientId === 'string' && clientId.length <= 64) {
    map.set(clientId, Date.now());
  }

  const count = Math.max(clientId ? 1 : 0, map.size);

  return NextResponse.json(
    { count, active: map.size },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

export async function POST(request: Request) {
  const map = cleanExpiredPresence();
  try {
    const body = await request.json().catch(() => ({}));
    const clientId = typeof body.clientId === 'string' ? body.clientId.slice(0, 64) : null;
    if (clientId) {
      map.set(clientId, Date.now());
    }
    const count = Math.max(clientId ? 1 : 0, map.size);
    return NextResponse.json(
      { count, active: map.size },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { count: Math.max(1, map.size) },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
