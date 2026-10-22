import fs from 'node:fs';
import path from 'node:path';
import { getDataDir } from './db.ts';
import { isValidPublicAdId } from './ad-rules.ts';
import { UnsupportedPngError, pngSize } from './png-upscale.ts';

export type ImageSize = { width: number; height: number };

/** Caminho do PNG do anuncio em DATA_DIR/uploads, ou null se o id for invalido ou o arquivo nao existir. */
export function adUploadPath(orderId: string): string | null {
  if (!isValidPublicAdId(orderId)) return null;
  const filePath = path.join(getDataDir(), 'uploads', `${orderId}.png`);
  return fs.existsSync(filePath) ? filePath : null;
}

/** Tamanho real do PNG salvo; sem arquivo legivel, usa o tamanho do bloco na grade. */
export function adImageSize(orderId: string, fallback: ImageSize): ImageSize {
  const filePath = adUploadPath(orderId);
  if (!filePath) return fallback;
  try {
    return pngSize(fs.readFileSync(filePath));
  } catch (err) {
    if (!(err instanceof UnsupportedPngError)) throw err;
    return fallback;
  }
}
