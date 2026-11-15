import { NextResponse } from 'next/server';
import { resolveAdRedirect } from '@/app/lib/ad-clicks';

// Conta o clique a cada acesso; nada de cache nem pre-render.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export function GET(request: Request, { params }: { params: { id: string } }) {
  const result = resolveAdRedirect(params.id, request.headers.get('user-agent'));
  if (result.status === 404) {
    return NextResponse.json({ error: 'Anúncio não encontrado' }, { status: 404, headers: NO_STORE });
  }
  // Destino vem do banco (link gravado do anuncio no ar), nunca da requisicao.
  return new NextResponse(null, { status: 302, headers: { ...NO_STORE, Location: result.location } });
}
