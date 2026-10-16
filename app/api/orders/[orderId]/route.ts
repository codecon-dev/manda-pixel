import { NextRequest, NextResponse } from 'next/server';
import {
  getAdByOrderId,
  syncOrderStatusWithGateway,
} from '@/app/lib/db';
import type { GatewayOrder, OrderSyncResponse } from '@/types/orders';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{
    orderId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { orderId } = await context.params;
    if (!orderId) {
      return NextResponse.json({ error: 'orderId obrigatório' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const cancelado = searchParams.get('cancelado') === '1';
    const expirado = searchParams.get('expirado') === '1';

    const gatewayUrl = process.env.GATEWAY_URL || 'http://gateway:8000';
    let gatewayRes: Response;
    try {
      gatewayRes = await fetch(`${gatewayUrl}/orders/${orderId}`, {
        cache: 'no-store',
      });
    } catch {
      // Se não alcançar o gateway, busca status local do banco
      const localAd = getAdByOrderId(orderId);
      if (!localAd) {
        return NextResponse.json(
          { error: 'Pedido não encontrado e gateway inacessível.' },
          { status: 502 }
        );
      }
      return NextResponse.json({
        order: {
          orderId,
          pixels: localAd.pixels,
          value: localAd.pixels,
          status: localAd.status === 'paid' ? 'paid' : 'pending',
          createdAt: localAd.created_at,
          expiresAt: localAd.expires_at || undefined,
        },
        ad: localAd,
      });
    }

    if (!gatewayRes.ok) {
      if (gatewayRes.status === 404) {
        return NextResponse.json({ error: 'Pedido não encontrado no gateway.' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Falha ao consultar gateway.' }, { status: gatewayRes.status });
    }

    const gatewayOrder: GatewayOrder = await gatewayRes.json();

    // Se cancelado ou expirado na URL e o status ainda for pending, forçamos expiração local
    if ((cancelado || expirado) && gatewayOrder.status === 'pending') {
      const updatedAd = syncOrderStatusWithGateway(orderId, {
        status: 'expired',
        expiresAt: new Date().toISOString(),
      });
      const responsePayload: OrderSyncResponse = {
        order: {
          ...gatewayOrder,
          status: 'expired',
        },
        ad: updatedAd,
      };
      return NextResponse.json(responsePayload);
    }

    const updatedAd = syncOrderStatusWithGateway(orderId, gatewayOrder);

    const responsePayload: OrderSyncResponse = {
      order: gatewayOrder,
      ad: updatedAd,
    };

    return NextResponse.json(responsePayload);
  } catch {
    return NextResponse.json(
      { error: 'Erro interno ao consultar pedido.' },
      { status: 500 }
    );
  }
}
