import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import {
  getDataDir,
  isAreaAvailable,
  createReservedAd,
} from '@/app/lib/db';
import { validateAdInput } from '@/app/lib/moderation';
import type { CreateOrderInput, CreateOrderResponse } from '@/types/orders';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: Partial<CreateOrderInput> = await request.json();
    const { x, y, w, h, title, link, imageDataUrl } = body;

    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof w !== 'number' ||
      typeof h !== 'number' ||
      !title ||
      !link ||
      !imageDataUrl
    ) {
      return NextResponse.json(
        { error: 'Dados incompletos. Informe x, y, w, h, título, link e imagem.' },
        { status: 400 }
      );
    }

    if (
      x % 5 !== 0 ||
      y % 5 !== 0 ||
      w % 5 !== 0 ||
      h % 5 !== 0 ||
      w < 5 ||
      h < 5 ||
      x < 0 ||
      y < 0 ||
      x + w > 1000 ||
      y + h > 1000
    ) {
      return NextResponse.json(
        { error: 'Dimensões ou coordenadas inválidas na grade.' },
        { status: 400 }
      );
    }

    const pixels = w * h;
    if (pixels < 25 || pixels > 1000000) {
      return NextResponse.json(
        { error: 'Tamanho em pixels fora do limite permitido (25 a 1.000.000).' },
        { status: 400 }
      );
    }

    // Moderação instantânea
    const moderation = validateAdInput({
      title,
      linkUrl: link,
      hasImage: true,
      acceptedTerms: true,
    });

    if (moderation.moderationStatus === 'rejected') {
      return NextResponse.json(
        { error: moderation.moderationReason || 'Conteúdo recusado pelas diretrizes.' },
        { status: 400 }
      );
    }

    // Checagem de disponibilidade na grade
    const available = isAreaAvailable(x, y, w, h);
    if (!available) {
      return NextResponse.json(
        { error: 'A área selecionada já está ocupada ou reservada.' },
        { status: 409 }
      );
    }

    // Gateway interno
    const gatewayUrl = process.env.GATEWAY_URL || 'http://gateway:8000';
    let gatewayRes: Response;
    try {
      gatewayRes = await fetch(`${gatewayUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixels }),
      });
    } catch {
      return NextResponse.json(
        { error: 'Sistema de pagamento indisponível no momento. Tente de novo em instantes.' },
        { status: 502 }
      );
    }

    if (!gatewayRes.ok) {
      return NextResponse.json(
        { error: 'Sistema de pagamento indisponível no momento. Tente de novo em instantes.' },
        { status: gatewayRes.status === 502 ? 502 : 500 }
      );
    }

    const gatewayData = await gatewayRes.json();
    const orderId = gatewayData.orderId;

    // Salva o PNG decodificando o dataUrl
    const dataDir = getDataDir();
    const uploadsDir = path.join(dataDir, 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const imageFilePath = path.join(uploadsDir, `${orderId}.png`);
    fs.writeFileSync(imageFilePath, buffer);

    const moderationDecision = moderation.moderationStatus === 'review' ? 'review' : 'approved';

    createReservedAd({
      id: orderId,
      order_id: orderId,
      x,
      y,
      w,
      h,
      title: title.trim(),
      link: link.trim(),
      image_path: `/api/uploads/${orderId}.png`,
      expires_at: gatewayData.expiresAt,
      moderation_decision: moderationDecision,
    });

    const responsePayload: CreateOrderResponse = {
      orderId,
      checkoutUrl: gatewayData.checkoutUrl,
      pixels: gatewayData.pixels,
      value: gatewayData.value,
      expiresAt: gatewayData.expiresAt,
      moderationStatus: moderationDecision,
    };

    return NextResponse.json(responsePayload, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Erro interno ao processar pedido.' },
      { status: 500 }
    );
  }
}
