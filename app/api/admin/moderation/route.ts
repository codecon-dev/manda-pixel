import { NextRequest, NextResponse } from 'next/server';
import {
  listAdsInReview,
  getModerationStats,
  approveAd,
  rejectAd,
} from '@/app/lib/moderation-queue';
import { syncGatewayOrders, syncPendingLocalOrders } from '@/app/lib/gateway-sync';
import type {
  ModerationListResponse,
  ModerationActionInput,
  ModerationActionResponse,
} from '@/types/orders';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_TOKEN || process.env.MODERATION_KEY;
  if (!secret) {
    // Se nenhuma chave estiver configurada no servidor, acesso liberado para administração local
    return true;
  }

  const headerKey = request.headers.get('x-admin-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const urlKey = request.nextUrl.searchParams.get('key');

  return headerKey === secret || urlKey === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Acesso não autorizado. Informe a chave de moderação.' }, { status: 401 });
  }

  try {
    // Sincroniza com gateway antes de listar
    await syncGatewayOrders(true).catch(() => {});
    await syncPendingLocalOrders().catch(() => {});

    const items = listAdsInReview();
    const stats = getModerationStats();

    const response: ModerationListResponse = {
      items,
      stats,
      syncedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar fila de moderação.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Acesso não autorizado. Informe a chave de moderação.' }, { status: 401 });
  }

  try {
    const body: Partial<ModerationActionInput> = await request.json();
    const { orderId, action, reason } = body;

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'orderId é obrigatório.' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: "action deve ser 'approve' ou 'reject'." }, { status: 400 });
    }

    let updatedItem;
    if (action === 'approve') {
      updatedItem = approveAd(orderId);
    } else {
      updatedItem = rejectAd(orderId, reason);
    }

    const payload: ModerationActionResponse = {
      success: true,
      item: updatedItem,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao processar moderação do anúncio.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
