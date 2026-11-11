import type { AdRect, CameraView } from '../../types/ads.ts';
import {
  CLUSTER_LINK_DISTANCE,
  FIT_MAX_ZOOM,
  GRID_MAX_COORD,
  INITIAL_CAMERA_MARGIN,
  INITIAL_CAMERA_MIN_ZOOM,
} from './constants.ts';

export interface CameraViewport {
  width: number;
  height: number;
  /** Faixas da tela cobertas por interface (header no topo, card na base), em px de tela. */
  insetTop?: number;
  insetBottom?: number;
}

export interface CameraZoomLimits {
  minZoom: number;
  maxZoom: number;
}

interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const GRID_CENTER = (GRID_MAX_COORD + 1) / 2;

/** Distância euclidiana entre as bordas de dois retângulos (0 se encostam ou se sobrepõem). */
export function rectGap(a: AdRect, b: AdRect): number {
  const dx = Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(0, b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.hypot(dx, dy);
}

function boundsOf(rects: readonly AdRect[]): Bounds {
  const b: Bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  for (const r of rects) {
    b.left = Math.min(b.left, r.x);
    b.top = Math.min(b.top, r.y);
    b.right = Math.max(b.right, r.x + r.w);
    b.bottom = Math.max(b.bottom, r.y + r.h);
  }
  return b;
}

function groupByProximity(rects: readonly AdRect[]): AdRect[][] {
  const parent = rects.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (rectGap(rects[i], rects[j]) <= CLUSTER_LINK_DISTANCE) parent[find(i)] = find(j);
    }
  }
  const groups = new Map<number, AdRect[]>();
  rects.forEach((r, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), r]);
  });
  return Array.from(groups.values());
}

function areaOf(rects: readonly AdRect[]): number {
  return rects.reduce((sum, r) => sum + r.w * r.h, 0);
}

function distanceToGridCenter(rects: readonly AdRect[]): number {
  const b = boundsOf(rects);
  return Math.hypot((b.left + b.right) / 2 - GRID_CENTER, (b.top + b.bottom) / 2 - GRID_CENTER);
}

/** Aglomerado principal: mais área vendida, depois mais blocos, depois mais perto do centro da grade. */
export function mainCluster(rects: readonly AdRect[]): AdRect[] {
  const groups = groupByProximity(rects);
  groups.sort(
    (a, b) =>
      areaOf(b) - areaOf(a) || b.length - a.length || distanceToGridCenter(a) - distanceToGridCenter(b)
  );
  return groups[0] ?? [];
}

function centerOfMass(rects: readonly AdRect[]): { x: number; y: number } {
  const area = areaOf(rects);
  let x = 0;
  let y = 0;
  for (const r of rects) {
    x += (r.x + r.w / 2) * r.w * r.h;
    y += (r.y + r.h / 2) * r.w * r.h;
  }
  return { x: x / area, y: y / area };
}

/**
 * Câmera inicial da home sem foco na URL: enquadra só o aglomerado principal, com margem,
 * e nunca abaixo do piso de legibilidade. Sem blocos: centro da grade (null, quem chama mantém o padrão).
 */
export function initialCamera(
  rects: readonly AdRect[],
  vp: CameraViewport,
  limits: CameraZoomLimits
): CameraView | null {
  const cluster = mainCluster(rects);
  if (cluster.length === 0) return null;

  const insetTop = vp.insetTop ?? 0;
  const insetBottom = vp.insetBottom ?? 0;
  const visibleHeight = Math.max(1, vp.height - insetTop - insetBottom);
  const b = boundsOf(cluster);
  const pad = 1 + 2 * INITIAL_CAMERA_MARGIN;
  const fitZoom = Math.min(vp.width / ((b.right - b.left) * pad), visibleHeight / ((b.bottom - b.top) * pad));
  const upper = Math.min(FIT_MAX_ZOOM, limits.maxZoom);
  const lower = Math.min(upper, Math.max(INITIAL_CAMERA_MIN_ZOOM, limits.minZoom));
  const zoom = Math.max(lower, Math.min(upper, fitZoom));

  const center = fitZoom < lower ? centerOfMass(cluster) : { x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 };
  // Leva o centro do aglomerado para o meio da faixa visível, não da tela inteira
  return { x: center.x, y: center.y - (insetTop - insetBottom) / 2 / zoom, zoom };
}
