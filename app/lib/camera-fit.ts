import type { AdRect, CameraView } from '../../types/ads.ts';
import { FIT_MAX_ZOOM, FIT_MIN_SIDE, FIT_VIEWPORT_FRACTION } from './constants.ts';

export interface FitViewport {
  width: number;
  height: number;
}

export interface FitZoomLimits {
  minZoom: number;
  maxZoom: number;
}

/** Câmera que enquadra todos os anúncios; null quando não há anúncio. */
export function fitCameraToAds(
  ads: readonly AdRect[],
  vp: FitViewport,
  opts: FitZoomLimits
): CameraView | null {
  if (ads.length === 0) return null;

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const ad of ads) {
    left = Math.min(left, ad.x);
    top = Math.min(top, ad.y);
    right = Math.max(right, ad.x + ad.w);
    bottom = Math.max(bottom, ad.y + ad.h);
  }

  const side = Math.max(right - left, bottom - top, FIT_MIN_SIDE);
  const rawZoom = (Math.min(vp.width, vp.height) * FIT_VIEWPORT_FRACTION) / side;
  const upper = Math.min(FIT_MAX_ZOOM, opts.maxZoom);
  const zoom = Math.max(opts.minZoom, Math.min(upper, rawZoom));

  return { x: (left + right) / 2, y: (top + bottom) / 2, zoom };
}
