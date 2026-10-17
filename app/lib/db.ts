import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export type GridBlockState = 'published' | 'in_review' | 'reserved';

export interface GridBlock {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  pixels: number;
  state: GridBlockState;
  imageUrl?: string;
  linkUrl?: string;
  altText?: string;
  xHandle?: string;
  expiresAt?: string;
}

export interface GridStats {
  totalPixels: number;
  soldPixels: number;
  reservedPixels: number;
  availablePixels: number;
  occupiedBlocksCount: number;
  centerTotalPixels?: number;
  centerSoldPixels?: number;
  centerReservedPixels?: number;
  centerAvailablePixels?: number;
}

export interface GridResponse {
  blocks: GridBlock[];
  stats: GridStats;
  updatedAt: string;
}

export interface AdRecord {
  order_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  pixels: number;
  status: 'pending' | 'reserved' | 'paid' | 'published' | 'in_review' | 'expired' | 'refunded' | string;
  moderation_status: 'approved' | 'review' | 'rejected' | string;
  moderation_decision?: 'approved' | 'review' | string | null;
  image_path?: string | null;
  link_url?: string | null;
  alt_text?: string | null;
  x_handle?: string | null;
  checkout_url?: string | null;
  created_at: string;
  expires_at?: string | null;
  paid_at?: string | null;
}

export interface CreateReservedAdParams {
  id?: string;
  order_id?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
  link?: string;
  image_path?: string;
  expires_at?: string;
  moderation_decision?: 'approved' | 'review' | string;
  checkout_url?: string;
}

export function getDataDir(): string {
  const preferred = process.env.DATA_DIR || '/data';
  try {
    fs.mkdirSync(preferred, { recursive: true });
    fs.accessSync(preferred, fs.constants.W_OK);
    fs.mkdirSync(path.join(preferred, 'uploads'), { recursive: true });
    return preferred;
  } catch {
    const fallback = '/tmp/mandapixel-data';
    fs.mkdirSync(fallback, { recursive: true });
    fs.mkdirSync(path.join(fallback, 'uploads'), { recursive: true });
    return fallback;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __mandapixel_db: DatabaseSync | undefined;
}

export function getDb(): DatabaseSync {
  if (global.__mandapixel_db) return global.__mandapixel_db;

  const dataDir = getDataDir();
  const db = new DatabaseSync(path.join(dataDir, 'mandapixel.db'));
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS ads (
      order_id TEXT PRIMARY KEY,
      x INTEGER NOT NULL, y INTEGER NOT NULL,
      w INTEGER NOT NULL, h INTEGER NOT NULL, pixels INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      moderation_status TEXT NOT NULL DEFAULT 'approved',
      moderation_decision TEXT DEFAULT 'approved',
      image_path TEXT, link_url TEXT, alt_text TEXT, x_handle TEXT,
      checkout_url TEXT, created_at TEXT NOT NULL, expires_at TEXT, paid_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ads_status ON ads (status, moderation_status);
    CREATE INDEX IF NOT EXISTS idx_ads_coords ON ads (x, y, w, h);
  `);

  try {
    db.exec("ALTER TABLE ads ADD COLUMN moderation_decision TEXT DEFAULT 'approved'");
  } catch {
    // Coluna ja existe
  }

  global.__mandapixel_db = db;
  return db;
}

export function expirePendingReservations(): void {
  const db = getDb();
  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE ads SET status = 'expired'
    WHERE status IN ('pending', 'reserved')
      AND expires_at IS NOT NULL
      AND (expires_at <= ? OR expires_at <= datetime('now'))
  `).run(nowIso);
}

export function isAreaAvailable(x: number, y: number, w: number, h: number, excludeOrderId?: string): boolean {
  if (x % 5 !== 0 || y % 5 !== 0 || w % 5 !== 0 || h % 5 !== 0) return false;
  if (w < 5 || h < 5 || x < 0 || y < 0 || x + w > 1000 || y + h > 1000) return false;

  const db = getDb();
  expirePendingReservations();

  const query = excludeOrderId
    ? `SELECT 1 FROM ads WHERE status IN ('paid', 'published', 'in_review', 'pending', 'reserved') AND moderation_status != 'rejected' AND order_id != ? AND NOT (? <= x OR ? >= (x + w) OR ? <= y OR ? >= (y + h)) LIMIT 1`
    : `SELECT 1 FROM ads WHERE status IN ('paid', 'published', 'in_review', 'pending', 'reserved') AND moderation_status != 'rejected' AND NOT (? <= x OR ? >= (x + w) OR ? <= y OR ? >= (y + h)) LIMIT 1`;

  const stmt = db.prepare(query);
  const collision = excludeOrderId ? stmt.get(excludeOrderId, x + w, x, y + h, y) : stmt.get(x + w, x, y + h, y);
  return !collision;
}

export function createReservedAd(params: CreateReservedAdParams): AdRecord {
  const db = getDb();
  const orderId = params.order_id || params.id;
  if (!orderId) throw new Error('order_id é obrigatório para criar reserva');

  const pixels = params.w * params.h;
  const createdAt = new Date().toISOString();
  const decision = params.moderation_decision || 'approved';

  db.prepare(`
    INSERT INTO ads (order_id, x, y, w, h, pixels, status, moderation_status, moderation_decision, image_path, link_url, alt_text, checkout_url, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, 'reserved', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderId, params.x, params.y, params.w, params.h, pixels,
    decision, decision, params.image_path || null, params.link || null,
    params.title || null, params.checkout_url || null, createdAt, params.expires_at || null
  );

  return {
    order_id: orderId, x: params.x, y: params.y, w: params.w, h: params.h, pixels,
    status: 'reserved', moderation_status: decision, moderation_decision: decision,
    image_path: params.image_path || null, link_url: params.link || null,
    alt_text: params.title || null, checkout_url: params.checkout_url || null,
    created_at: createdAt, expires_at: params.expires_at || null, paid_at: null,
  };
}

export function getAdByOrderId(orderId: string): AdRecord | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM ads WHERE order_id = ?`).get(orderId);
  return (row as unknown as AdRecord) || null;
}

export function syncOrderStatusWithGateway(
  orderId: string,
  gatewayOrder: { status: string; paidAt?: string; expiresAt?: string }
): AdRecord | null {
  const db = getDb();
  const ad = getAdByOrderId(orderId);
  if (!ad) return null;

  if (gatewayOrder.status === 'paid') {
    if (ad.status === 'published' || ad.status === 'in_review') return ad;

    const available = isAreaAvailable(ad.x, ad.y, ad.w, ad.h, orderId);
    if (!available) {
      db.prepare(`UPDATE ads SET status = 'conflict_refund_needed', paid_at = COALESCE(?, paid_at, datetime('now')) WHERE order_id = ?`)
        .run(gatewayOrder.paidAt || null, orderId);
      return getAdByOrderId(orderId);
    }

    const isReview = ad.moderation_decision === 'review' || ad.moderation_status === 'review';
    const nextStatus = isReview ? 'in_review' : 'published';
    const paidAt = gatewayOrder.paidAt || new Date().toISOString();

    db.prepare(`UPDATE ads SET status = ?, paid_at = ? WHERE order_id = ?`).run(nextStatus, paidAt, orderId);
    return getAdByOrderId(orderId);
  }

  if (gatewayOrder.status === 'expired' || gatewayOrder.status === 'refunded') {
    db.prepare(`UPDATE ads SET status = ?, moderation_status = CASE WHEN ? = 'refunded' THEN 'refunded' ELSE moderation_status END WHERE order_id = ?`)
      .run(gatewayOrder.status, gatewayOrder.status, orderId);
    return getAdByOrderId(orderId);
  }

  return ad;
}

function normalizeImageUrl(imagePath?: string | null): string | undefined {
  if (!imagePath) return undefined;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('/')) {
    return imagePath;
  }
  return `/api/uploads/${imagePath}`;
}

export function getGridState(): GridResponse {
  const db = getDb();
  expirePendingReservations();

  const stmt = db.prepare(`
    SELECT order_id, x, y, w, h, pixels, status, moderation_status, moderation_decision, image_path, link_url, alt_text, x_handle, expires_at
    FROM ads
    WHERE status IN ('paid', 'published', 'in_review', 'pending', 'reserved') AND moderation_status != 'rejected'
    ORDER BY created_at ASC
  `);

  const rows = stmt.all() as unknown as AdRecord[];
  const blocks: GridBlock[] = [];
  let soldPixels = 0;
  let reservedPixels = 0;

  for (const row of rows) {
    if (row.status === 'paid' || row.status === 'published') {
      const isReview = row.moderation_decision === 'review' || row.moderation_status === 'review';
      if (isReview) {
        blocks.push({ id: row.order_id, x: row.x, y: row.y, w: row.w, h: row.h, pixels: row.pixels, state: 'in_review' });
      } else {
        blocks.push({
          id: row.order_id, x: row.x, y: row.y, w: row.w, h: row.h, pixels: row.pixels, state: 'published',
          imageUrl: normalizeImageUrl(row.image_path), linkUrl: row.link_url || undefined,
          altText: row.alt_text || undefined, xHandle: row.x_handle || undefined,
        });
      }
      soldPixels += row.pixels;
    } else if (row.status === 'in_review') {
      blocks.push({ id: row.order_id, x: row.x, y: row.y, w: row.w, h: row.h, pixels: row.pixels, state: 'in_review' });
      soldPixels += row.pixels;
    } else if (row.status === 'pending' || row.status === 'reserved') {
      blocks.push({
        id: row.order_id, x: row.x, y: row.y, w: row.w, h: row.h, pixels: row.pixels, state: 'reserved',
        expiresAt: row.expires_at || undefined,
      });
      reservedPixels += row.pixels;
    }
  }

  const totalPixels = 1000000;
  const availablePixels = Math.max(0, totalPixels - soldPixels - reservedPixels);

  return {
    blocks,
    stats: { totalPixels, soldPixels, reservedPixels, availablePixels, occupiedBlocksCount: blocks.length },
    updatedAt: new Date().toISOString(),
  };
}
