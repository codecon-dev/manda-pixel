import { getDb, isAreaAvailable, type AdRecord } from './db.ts';
import type { ModerationQueueItem } from '../../types/orders.ts';

function normalizeImageUrl(imagePath?: string | null): string | undefined {
  if (!imagePath) return undefined;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('/')) {
    return imagePath;
  }
  return `/api/uploads/${imagePath}`;
}

export function listAdsInReview(): ModerationQueueItem[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM ads
    WHERE status = 'in_review'
       OR (status = 'paid' AND (moderation_status = 'review' OR moderation_decision = 'review'))
    ORDER BY created_at DESC
  `).all() as unknown as AdRecord[];

  return rows.map(mapAdToModerationQueueItem);
}

export function listRecentModerationItems(limit = 50): ModerationQueueItem[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM ads
    WHERE status IN ('in_review', 'published', 'rejected', 'conflict_refund_needed')
       OR moderation_status IN ('review', 'rejected')
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as unknown as AdRecord[];

  return rows.map(mapAdToModerationQueueItem);
}

export function getModerationStats(): {
  inReviewCount: number;
  publishedCount: number;
  rejectedCount: number;
} {
  const db = getDb();
  const inReviewRow = db.prepare(`
    SELECT COUNT(*) as count FROM ads
    WHERE status = 'in_review'
       OR (status = 'paid' AND (moderation_status = 'review' OR moderation_decision = 'review'))
  `).get() as { count: number };

  const publishedRow = db.prepare(`
    SELECT COUNT(*) as count FROM ads
    WHERE status = 'published'
  `).get() as { count: number };

  const rejectedRow = db.prepare(`
    SELECT COUNT(*) as count FROM ads
    WHERE moderation_status = 'rejected' OR status = 'rejected'
  `).get() as { count: number };

  return {
    inReviewCount: inReviewRow?.count || 0,
    publishedCount: publishedRow?.count || 0,
    rejectedCount: rejectedRow?.count || 0,
  };
}

export function approveAd(orderId: string): ModerationQueueItem {
  const db = getDb();
  const ad = db.prepare(`SELECT * FROM ads WHERE order_id = ?`).get(orderId) as unknown as AdRecord | undefined;
  if (!ad) {
    throw new Error('Pedido não encontrado para aprovação');
  }

  const available = isAreaAvailable(ad.x, ad.y, ad.w, ad.h, orderId);
  if (!available) {
    throw new Error('Área do anúncio já está ocupada por outro anúncio');
  }

  db.prepare(`
    UPDATE ads
    SET status = 'published',
        moderation_status = 'approved',
        moderation_decision = 'approved'
    WHERE order_id = ?
  `).run(orderId);

  const updated = db.prepare(`SELECT * FROM ads WHERE order_id = ?`).get(orderId) as unknown as AdRecord;
  return mapAdToModerationQueueItem(updated);
}

export function rejectAd(orderId: string, reason?: string): ModerationQueueItem {
  const db = getDb();
  const ad = db.prepare(`SELECT * FROM ads WHERE order_id = ?`).get(orderId) as unknown as AdRecord | undefined;
  if (!ad) {
    throw new Error('Pedido não encontrado para recusa');
  }

  db.prepare(`
    UPDATE ads
    SET status = 'rejected',
        moderation_status = 'rejected',
        moderation_decision = 'rejected',
        alt_text = COALESCE(?, alt_text)
    WHERE order_id = ?
  `).run(reason ? `[RECUSADO: ${reason}] ${ad.alt_text || ''}` : ad.alt_text, orderId);

  const updated = db.prepare(`SELECT * FROM ads WHERE order_id = ?`).get(orderId) as unknown as AdRecord;
  return mapAdToModerationQueueItem(updated);
}

function mapAdToModerationQueueItem(ad: AdRecord): ModerationQueueItem {
  return {
    orderId: ad.order_id,
    x: ad.x,
    y: ad.y,
    w: ad.w,
    h: ad.h,
    pixels: ad.pixels,
    title: ad.alt_text || '',
    link: ad.link_url || '',
    imageUrl: normalizeImageUrl(ad.image_path),
    status: ad.status,
    moderationStatus: ad.moderation_status,
    moderationDecision: ad.moderation_decision || null,
    createdAt: ad.created_at,
    paidAt: ad.paid_at || null,
    expiresAt: ad.expires_at || null,
  };
}
