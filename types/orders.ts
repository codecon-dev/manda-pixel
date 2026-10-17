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

export interface OrderSyncResponse {
  order: GatewayOrder;
  ad: AdRecord | null;
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
