import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { getDataDir } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> | { filename: string } }
) {
  try {
    const params = await Promise.resolve(context.params);
    const rawFilename = params?.filename || '';
    const safeFilename = path.basename(rawFilename);

    if (!safeFilename || safeFilename.startsWith('.')) {
      return new NextResponse('Arquivo inválido', { status: 400 });
    }

    const dataDir = getDataDir();
    const filePath = path.join(dataDir, 'uploads', safeFilename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Imagem não encontrada', { status: 404 });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const fileBuffer = fs.readFileSync(filePath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Erro ao servir upload:', error);
    return new NextResponse('Erro interno', { status: 500 });
  }
}
