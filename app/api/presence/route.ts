import { NextResponse } from 'next/server';
import { cleanExpiredPresence, isValidClientId } from '@/app/lib/presence';
import { clientKey, createRateLimiter } from '@/app/lib/rate-limit';
import { PRESENCE_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from '@/app/lib/constants';

export const dynamic = 'force-dynamic';

const presenceLimiter = createRateLimiter({ limit: PRESENCE_RATE_LIMIT, windowMs: RATE_LIMIT_WINDOW_MS });

function registerHeartbeat(request: Request, clientId: unknown): NextResponse {
  if (!isValidClientId(clientId)) {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  }
  const limited = presenceLimiter.check(clientKey(request.headers));
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Muitas tentativas seguidas. Espere um minuto e tente de novo.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }
  const map = cleanExpiredPresence();
  map.set(clientId, Date.now());
  return NextResponse.json(
    { count: Math.max(1, map.size), active: map.size },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return registerHeartbeat(request, searchParams.get('clientId'));
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const clientId = body && typeof body === 'object' ? (body as { clientId?: unknown }).clientId : undefined;
  return registerHeartbeat(request, clientId);
}
