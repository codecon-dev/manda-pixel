import type { AdRecord } from '@/app/lib/db';

export interface CreateOrderInput {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  link: string;
  imageDataUrl: string;
}

export interface CreateOrderResponse {
  orderId: string;
  checkoutUrl: string;
  pixels: number;
  value: number;
  expiresAt: string;
  moderationStatus: 'approved' | 'review';
}

export interface GatewayOrder {
  orderId: string;
  pixels: number;
  value: number;
  status: 'pending' | 'paid' | 'expired' | 'refunded';
  createdAt: string;
  paidAt?: string;
  expiresAt?: string;
  checkoutUrl?: string;
}

/** Pedido como o navegador ve: whitelist, sem valor, datas nem dado do comprador. */
export interface PublicOrder {
  orderId: string;
  status: GatewayOrder['status'];
  pixels: number;
  /** So presente com status 'pending'. */
  checkoutUrl?: string;
}

/** Anuncio como o navegador ve: whitelist de AdRecord, sem visitor_id nem medidas internas. */
export type PublicAd = Pick<AdRecord, 'status' | 'moderation_status' | 'x' | 'y' | 'w' | 'h'> & {
  moderation_decision: string | null;
  image_path: string | null;
  alt_text: string | null;
  link_url: string | null;
};

export interface OrderSyncResponse {
  order: PublicOrder;
  ad: PublicAd | null;
}

export interface ModerationQueueItem {
  orderId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  pixels: number;
  title: string;
  link: string;
  imageUrl?: string;
  status: string;
  moderationStatus: string;
  moderationDecision?: string | null;
  moderationReason?: string | null;
  createdAt: string;
  paidAt?: string | null;
  expiresAt?: string | null;
  /** Fracao de pixels na cor dominante (0-1). null em pedido antigo ou PNG nao decodificavel. */
  dominantRatio: number | null;
}

export interface ModerationListResponse {
  items: ModerationQueueItem[];
  stats: {
    inReviewCount: number;
    publishedCount: number;
    rejectedCount: number;
  };
  syncedAt: string;
}

export interface ModerationActionInput {
  orderId: string;
  action: 'approve' | 'reject';
  reason?: string;
}

export interface ModerationActionResponse {
  success: boolean;
  item: ModerationQueueItem;
}

export interface OrderErrorResponse {
  error: string;
}

export interface OrderStatusResult {
  httpStatus: number;
  body: OrderSyncResponse | OrderErrorResponse;
}
