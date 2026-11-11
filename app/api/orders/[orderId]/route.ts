import { NextResponse } from 'next/server';
import { isValidPublicAdId } from '@/app/lib/ad-rules';
import { readOrderStatus } from '@/app/lib/order-status';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{
    orderId: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  if (typeof orderId !== 'string' || !isValidPublicAdId(orderId)) {
    return NextResponse.json({ error: 'orderId inválido' }, { status: 400 });
  }

  try {
    const result = await readOrderStatus(orderId);
    return NextResponse.json(result.body, { status: result.httpStatus });
  } catch (err) {
    console.error('[GET /api/orders/:orderId] falha', { orderId, err: String(err) });
    return NextResponse.json({ error: 'Erro interno ao consultar pedido.' }, { status: 500 });
  }
}
