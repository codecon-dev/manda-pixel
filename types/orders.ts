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
