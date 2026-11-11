import fs from 'node:fs';
import path from 'node:path';
import { getAdByOrderId, getDataDir, getDb } from './db.ts';
import { isValidPublicAdId } from './ad-rules.ts';
import { EXPIRED_UPLOAD_SWEEP_MS } from './constants.ts';
import { UnsupportedPngError, pngSize } from './png-upscale.ts';

const EXPIRED_STATUS = 'expired';
let lastExpiredSweep = 0;

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

function unlinkAdUpload(orderId: string): boolean {
  if (!isValidPublicAdId(orderId)) return false;
  const filePath = path.join(getDataDir(), 'uploads', `${orderId}.png`);
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw err;
  }
}

/** Apaga o PNG do pedido so se ele estiver expirado no banco. */
export function removeExpiredAdUpload(orderId: string): boolean {
  if (!isValidPublicAdId(orderId)) return false;
  const ad = getAdByOrderId(orderId);
  if (!ad || ad.status !== EXPIRED_STATUS) return false;
  return unlinkAdUpload(orderId);
}

/** Apaga o PNG de todo pedido expirado. Roda no maximo uma vez por intervalo, salvo force. */
export function sweepExpiredAdUploads(force = false): number {
  const now = Date.now();
  if (!force && now - lastExpiredSweep < EXPIRED_UPLOAD_SWEEP_MS) return 0;
  lastExpiredSweep = now;

  const rows = getDb()
    .prepare(`SELECT order_id FROM ads WHERE status = ?`)
    .all(EXPIRED_STATUS) as unknown as { order_id: string }[];
  let removed = 0;
  for (const row of rows) {
    if (unlinkAdUpload(row.order_id)) removed++;
  }
  return removed;
}
