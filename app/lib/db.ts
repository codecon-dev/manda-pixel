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
  status: 'pending' | 'paid' | 'expired' | 'refunded';
  moderation_status: 'approved' | 'review' | 'rejected';
  image_path?: string | null;
  link_url?: string | null;
  alt_text?: string | null;
  x_handle?: string | null;
  checkout_url?: string | null;
  created_at: string;
  expires_at?: string | null;
  paid_at?: string | null;
}

export function getDataDir(): string {
  const preferred = process.env.DATA_DIR || '/data';
  try {
    fs.mkdirSync(preferred, { recursive: true });
    fs.accessSync(preferred, fs.constants.W_OK);
    const uploadsDir = path.join(preferred, 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    return preferred;
  } catch {
    const fallback = '/tmp/mandapixel-data';
    fs.mkdirSync(fallback, { recursive: true });
    const fallbackUploads = path.join(fallback, 'uploads');
    fs.mkdirSync(fallbackUploads, { recursive: true });
    return fallback;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __mandapixel_db: DatabaseSync | undefined;
}

export function getDb(): DatabaseSync {
  if (global.__mandapixel_db) {
    return global.__mandapixel_db;
  }

  const dataDir = getDataDir();
  const dbPath = path.join(dataDir, 'mandapixel.db');
  const db = new DatabaseSync(dbPath);

  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS ads (
      order_id TEXT PRIMARY KEY,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      w INTEGER NOT NULL,
      h INTEGER NOT NULL,
      pixels INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      moderation_status TEXT NOT NULL DEFAULT 'approved',
      image_path TEXT,
      link_url TEXT,
      alt_text TEXT,
      x_handle TEXT,
      checkout_url TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      paid_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ads_status ON ads (status, moderation_status);
    CREATE INDEX IF NOT EXISTS idx_ads_coords ON ads (x, y, w, h);
  `);

  global.__mandapixel_db = db;
  return db;
}

export function expirePendingReservations(): void {
  const db = getDb();
  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE ads
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at IS NOT NULL
      AND (expires_at <= ? OR expires_at <= datetime('now'))
  `).run(nowIso);
}

export function getGridState(): GridResponse {
  const db = getDb();

  // Expira reservas pendentes que ultrapassaram o tempo limite
  expirePendingReservations();

  const stmt = db.prepare(`
    SELECT
      order_id,
      x,
      y,
      w,
      h,
      pixels,
      status,
      moderation_status,
      image_path,
      link_url,
      alt_text,
      x_handle,
      expires_at
    FROM ads
    WHERE status IN ('paid', 'pending')
      AND moderation_status != 'rejected'
    ORDER BY created_at ASC
  `);

  const rows = stmt.all() as unknown as Array<{
    order_id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    pixels: number;
    status: string;
    moderation_status: string;
    image_path?: string | null;
    link_url?: string | null;
    alt_text?: string | null;
    x_handle?: string | null;
    expires_at?: string | null;
  }>;

  const blocks: GridBlock[] = [];
  let soldPixels = 0;
  let reservedPixels = 0;

  for (const row of rows) {
    if (row.status === 'paid') {
      if (row.moderation_status === 'approved') {
        let imageUrl = row.image_path || undefined;
        if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('/')) {
          imageUrl = `/api/uploads/${imageUrl}`;
        }
        blocks.push({
          id: row.order_id,
          x: row.x,
          y: row.y,
          w: row.w,
          h: row.h,
          pixels: row.pixels,
          state: 'published',
          imageUrl,
          linkUrl: row.link_url || undefined,
          altText: row.alt_text || undefined,
          xHandle: row.x_handle || undefined,
        });
        soldPixels += row.pixels;
      } else if (row.moderation_status === 'review') {
        blocks.push({
          id: row.order_id,
          x: row.x,
          y: row.y,
          w: row.w,
          h: row.h,
          pixels: row.pixels,
          state: 'in_review',
        });
        soldPixels += row.pixels;
      }
    } else if (row.status === 'pending') {
      blocks.push({
        id: row.order_id,
        x: row.x,
        y: row.y,
        w: row.w,
        h: row.h,
        pixels: row.pixels,
        state: 'reserved',
        expiresAt: row.expires_at || undefined,
      });
      reservedPixels += row.pixels;
    }
  }

  const totalPixels = 1000000;
  const availablePixels = Math.max(0, totalPixels - soldPixels - reservedPixels);

  return {
    blocks,
    stats: {
      totalPixels,
      soldPixels,
      reservedPixels,
      availablePixels,
      occupiedBlocksCount: blocks.length,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function isAreaAvailable(x: number, y: number, w: number, h: number): boolean {
  // Valida alinhamento e dimensões
  if (x % 5 !== 0 || y % 5 !== 0 || w % 5 !== 0 || h % 5 !== 0) return false;
  if (w < 5 || h < 5) return false;
  if (x < 0 || y < 0 || x + w > 1000 || y + h > 1000) return false;

  const db = getDb();
  expirePendingReservations();

  const stmt = db.prepare(`
    SELECT 1 FROM ads
    WHERE status IN ('paid', 'pending')
      AND moderation_status != 'rejected'
      AND NOT (
        ? <= x OR
        ? >= (x + w) OR
        ? <= y OR
        ? >= (y + h)
      )
    LIMIT 1
  `);

  const collision = stmt.get(x + w, x, y + h, y);
  return !collision;
}
