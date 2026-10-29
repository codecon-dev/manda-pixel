'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GridBlock, GridStats } from '../lib/db';
import BuyPanel from './BuyPanel';
import AdTooltip, { type AdTooltipTarget } from './AdTooltip';
import { FOCUS_ZOOM, SMOOTH_MIN_SCALE } from '../lib/constants.ts';
import type { GridFocus } from '@/types/ads';
import { selectionStartFromCamera } from '../lib/selection-start.ts';
import { fitCameraToAds } from '../lib/camera-fit.ts';
import { trackBlocoSelecionado, trackCheckoutRetorno } from '../lib/analytics';
import WelcomeCard from './WelcomeCard';
import ExperimentDay from './ExperimentDay';

interface Point {
  x: number;
  y: number;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface SelectedArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type HandleType = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'w' | 'e' | 'move' | 'pan' | 'pinch' | null;

export const PRESETS = [
  { w: 5, h: 5, label: '5×5', price: 25 },
  { w: 10, h: 10, label: '10×10', price: 100 },
  { w: 20, h: 20, label: '20×20', price: 400 },
  { w: 50, h: 20, label: '50×20', price: 1000 },
];

export function isAreaFree(
  x: number,
  y: number,
  w: number,
  h: number,
  blocksList: GridBlock[] = []
): boolean {
  if (x < 0 || y < 0 || x + w > 1000 || y + h > 1000 || w < 5 || h < 5) {
    return false;
  }
  for (const b of blocksList) {
    if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) {
      return false;
    }
  }
  return true;
}

export function findFreeBlockNear(
  targetX = 500,
  targetY = 500,
  prefW = 10,
  prefH = 10,
  blocksList: GridBlock[] = []
): SelectedArea {
  const snapX = Math.floor(Math.max(0, Math.min(1000 - prefW, targetX)) / 5) * 5;
  const snapY = Math.floor(Math.max(0, Math.min(1000 - prefH, targetY)) / 5) * 5;

  if (isAreaFree(snapX, snapY, prefW, prefH, blocksList)) {
    return { x: snapX, y: snapY, w: prefW, h: prefH };
  }
  if (isAreaFree(snapX, snapY, 5, 5, blocksList)) {
    return { x: snapX, y: snapY, w: 5, h: 5 };
  }

  for (let r = 5; r <= 500; r += 5) {
    for (let dx = -r; dx <= r; dx += 5) {
      for (const dy of [-r, r]) {
        const x = snapX + dx;
        const y = snapY + dy;
        if (isAreaFree(x, y, prefW, prefH, blocksList)) {
          return { x, y, w: prefW, h: prefH };
        }
        if (isAreaFree(x, y, 5, 5, blocksList)) {
          return { x, y, w: 5, h: 5 };
        }
      }
    }
    for (let dy = -r + 5; dy <= r - 5; dy += 5) {
      for (const dx of [-r, r]) {
        const x = snapX + dx;
        const y = snapY + dy;
        if (isAreaFree(x, y, prefW, prefH, blocksList)) {
          return { x, y, w: prefW, h: prefH };
        }
        if (isAreaFree(x, y, 5, 5, blocksList)) {
          return { x, y, w: 5, h: 5 };
        }
      }
    }
  }

  return { x: snapX, y: snapY, w: 5, h: 5 };
}

function getHandleHit(
  screenX: number,
  screenY: number,
  area: SelectedArea | null,
  cam: Camera,
  vp: { width: number; height: number }
): HandleType {
  if (!area) return null;

  const originX = (area.x - cam.x) * cam.zoom + vp.width / 2;
  const originY = (area.y - cam.y) * cam.zoom + vp.height / 2;
  const wPx = area.w * cam.zoom;
  const hPx = area.h * cam.zoom;
  const rightX = originX + wPx;
  const bottomY = originY + hPx;
  const midX = originX + wPx / 2;
  const midY = originY + hPx / 2;

  const cornerR = 18;
  const edgeR = 14;

  // Cantos
  if (Math.hypot(screenX - originX, screenY - originY) <= cornerR) return 'nw';
  if (Math.hypot(screenX - rightX, screenY - originY) <= cornerR) return 'ne';
  if (Math.hypot(screenX - rightX, screenY - bottomY) <= cornerR) return 'se';
  if (Math.hypot(screenX - originX, screenY - bottomY) <= cornerR) return 'sw';

  // Bordas
  if (wPx > 18 && Math.hypot(screenX - midX, screenY - originY) <= edgeR) return 'n';
  if (wPx > 18 && Math.hypot(screenX - midX, screenY - bottomY) <= edgeR) return 's';
  if (hPx > 18 && Math.hypot(screenX - originX, screenY - midY) <= edgeR) return 'w';
  if (hPx > 18 && Math.hypot(screenX - rightX, screenY - midY) <= edgeR) return 'e';

  // Interior para arrastar / mover
  if (screenX >= originX && screenX <= rightX && screenY >= originY && screenY <= bottomY) {
    return 'move';
  }

  return null;
}

interface PixelCanvasProps {
  blocks?: GridBlock[];
  stats?: GridStats;
  onRefresh?: () => void;
  /** Ponto para abrir a grade focada (vem de ?x=&y= na home). */
  focus?: GridFocus;
}

const GRID_SIZE = 1000;
const BLOCK_SIZE = 5; // Bloco mínimo de 5x5 pixels (R$ 1/pixel = R$ 25)
const MAX_ZOOM = 24;

export default function PixelCanvas({ blocks = [], stats, onRefresh, focus }: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Câmera no espaço do mundo (coordenada central 500, 500, ou o foco da URL)
  const cameraRef = useRef<Camera>(
    focus ? { x: focus.x, y: focus.y, zoom: FOCUS_ZOOM } : { x: 500, y: 500, zoom: 1.2 }
  );
  const [zoomDisplay, setZoomDisplay] = useState<number>(120);

  // Cache de imagens dos blocos publicados
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Coordenada do cursor / centro no mundo (alinhada em múltiplos de 5)
  const [cursorCoord, setCursorCoord] = useState<{ x: number; y: number; inside: boolean }>({
    x: 500,
    y: 500,
    inside: true,
  });

  // Bloco sob o cursor (hover) para exibir tooltip
  const [hoveredBlock, setHoveredBlock] = useState<AdTooltipTarget | null>(null);

  // Card do anúncio aberto pelo primeiro toque (mobile não tem hover)
  const [touchCard, setTouchCard] = useState<AdTooltipTarget | null>(null);

  // Célula livre sob o cursor para feedback de snap
  const [hoveredFreeCell, setHoveredFreeCell] = useState<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Área selecionada pelo usuário (inicia vazia: nada cobre a grade até o visitante agir)
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null);

  const selectedAreaRef = useRef<SelectedArea | null>(selectedArea);
  useEffect(() => {
    selectedAreaRef.current = selectedArea;
  }, [selectedArea]);

  const blocksRef = useRef<GridBlock[]>(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
    // Se a seleção inicial ou atual colidir com algum bloco que acabou de chegar, realoca para o livre mais próximo
    if (selectedAreaRef.current && !isAreaFree(selectedAreaRef.current.x, selectedAreaRef.current.y, selectedAreaRef.current.w, selectedAreaRef.current.h, blocks)) {
      const freeArea = findFreeBlockNear(selectedAreaRef.current.x, selectedAreaRef.current.y, selectedAreaRef.current.w, selectedAreaRef.current.h, blocks);
      setSelectedArea(freeArea);
    }
  }, [blocks]);

  // Alça sob o cursor para feedback visual
  const [hoverHandle, setHoverHandle] = useState<HandleType>(null);

  // Alertas visuais de colisão e notificações
  const [collisionWarning, setCollisionWarning] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'warning' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (!collisionWarning) return;
    const t = setTimeout(() => setCollisionWarning(null), 3000);
    return () => clearTimeout(t);
  }, [collisionWarning]);

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 3500);
    return () => clearTimeout(t);
  }, [notification]);

  // Modo de interação atual ('nw', 'se', 'move', 'pan', etc.)
  const interactionModeRef = useRef<HandleType>(null);
  const dragStartAreaRef = useRef<SelectedArea | null>(null);
  const dragStartWorldPointRef = useRef<Point>({ x: 0, y: 0 });

  // Painel lateral e gaveta de compra com preview em tempo real
  const [buyPanelOpen, setBuyPanelOpen] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);

  // Presença ao vivo (heartbeat)
  const [onlineCount, setOnlineCount] = useState<number>(1);

  // Banner compacto de boas-vindas na primeira visita
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const showWelcomeRef = useRef<boolean>(false);

  // Retorno de checkout cancelado ou expirado via query params
  const [returnBanner, setReturnBanner] = useState<{
    type: 'cancelado' | 'expirado';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order');
    const cancelado = params.get('cancelado');
    const expirado = params.get('expirado');

    if (orderId && (cancelado === '1' || expirado === '1')) {
      const motivo: 'cancelado' | 'expirado' = cancelado === '1' ? 'cancelado' : 'expirado';
      const message =
        motivo === 'cancelado'
          ? 'Seu pagamento foi cancelado. A área selecionada foi liberada na grade.'
          : 'O tempo limite da reserva expirou. A área selecionada foi liberada na grade.';

      setReturnBanner({ type: motivo, message });

      trackCheckoutRetorno({
        orderId,
        resultado: motivo,
      });

      fetch(`/api/orders/${orderId}?${motivo}=1`, { cache: 'no-store' })
        .then(() => {
          if (onRefresh) onRefresh();
        })
        .catch(() => {});
    }
  }, [onRefresh]);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    showWelcomeRef.current = false;
    try {
      localStorage.setItem('mandapixel_welcome_dismissed', 'true');
    } catch {
      // ignore
    }
  }, []);

  // Verifica primeira visita para exibir boas-vindas
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('mandapixel_welcome_dismissed');
      if (!dismissed) {
        setShowWelcome(true);
        showWelcomeRef.current = true;
      }
    } catch {
      // ignore
    }
  }, []);

  // Heartbeat de presença a cada 25s
  useEffect(() => {
    const getClientId = (): string => {
      try {
        let id = sessionStorage.getItem('mandapixel_client_id');
        if (!id) {
          id = 'mp_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
          sessionStorage.setItem('mandapixel_client_id', id);
        }
        return id;
      } catch {
        return 'mp_' + Math.random().toString(36).substring(2, 11);
      }
    };

    const clientId = getClientId();

    const sendHeartbeat = async () => {
      try {
        const res = await fetch(`/api/presence?clientId=${encodeURIComponent(clientId)}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.count === 'number' && data.count >= 1) {
            setOnlineCount(data.count);
          }
        }
      } catch {
        // mantém o contador atual em caso de instabilidade de rede
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 25000);
    return () => clearInterval(interval);
  }, []);

  // Estados de interação e arraste
  const isDraggingRef = useRef(false);
  const dragStartScreenRef = useRef<Point>({ x: 0, y: 0 });
  const dragStartCamRef = useRef<Point>({ x: 500, y: 500 });
  const lastPointerPosRef = useRef<Point>({ x: 0, y: 0 });
  const lastPointerTimeRef = useRef<number>(0);
  const pointerDistanceTraveledRef = useRef<number>(0);

  // Velocidade para inércia
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });

  // Animação ativa (rAF)
  const animFrameIdRef = useRef<number | null>(null);
  const isTransitioningRef = useRef<boolean>(false);

  // Rastreamento de toques múltiplos (pinch-to-zoom)
  const activePointersRef = useRef<Map<number, Point>>(new Map());
  const pinchStartDistRef = useRef<number>(0);
  const pinchStartZoomRef = useRef<number>(1.2);
  const pinchStartCenterRef = useRef<Point>({ x: 0, y: 0 });
  const pinchStartCamRef = useRef<Point>({ x: 500, y: 500 });

  // Dimensões da viewport
  const viewportRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Pré-carrega imagens de blocos publicados e atualiza canvas quando prontas
  useEffect(() => {
    const cache = imageCacheRef.current;
    blocks.forEach((block) => {
      if (block.state === 'published' && block.imageUrl && !cache.has(block.imageUrl)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = block.imageUrl;
        img.onload = () => {
          renderCanvas();
        };
        cache.set(block.imageUrl, img);
      }
    });
  }, [blocks]);

  // Calcula zoom mínimo para que a grade 1000x1000 caiba confortavelmente
  const getMinZoom = useCallback(() => {
    const { width, height } = viewportRef.current;
    if (!width || !height) return 0.4;
    const fitZoom = Math.min(width * 0.85, height * 0.85) / GRID_SIZE;
    return Math.max(0.2, Math.min(fitZoom, 0.8));
  }, []);

  // Limites suaves de pan
  const clampCameraPosition = useCallback((x: number, y: number): Point => {
    const margin = 150;
    const clampedX = Math.max(-margin, Math.min(GRID_SIZE + margin, x));
    const clampedY = Math.max(-margin, Math.min(GRID_SIZE + margin, y));
    return { x: clampedX, y: clampedY };
  }, []);

  // Conversões entre tela e mundo
  const screenToWorld = useCallback((sx: number, sy: number, cam = cameraRef.current): Point => {
    const { width, height } = viewportRef.current;
    return {
      x: (sx - width / 2) / cam.zoom + cam.x,
      y: (sy - height / 2) / cam.zoom + cam.y,
    };
  }, []);

  const worldToScreen = useCallback((wx: number, wy: number, cam = cameraRef.current): Point => {
    const { width, height } = viewportRef.current;
    return {
      x: (wx - cam.x) * cam.zoom + width / 2,
      y: (wy - cam.y) * cam.zoom + height / 2,
    };
  }, []);

  // Renderizador principal da grade (alta performance a 60fps)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vp = viewportRef.current;
    const cam = cameraRef.current;
    if (vp.width === 0 || vp.height === 0) return;

    // Limpa a tela com tom neutro elegante do fundo infinito
    ctx.fillStyle = '#f4f4f5';
    ctx.fillRect(0, 0, vp.width, vp.height);

    // Padrão pontilhado sutil fora da grade para estética thiings
    const dotSpacing = 32;
    ctx.fillStyle = 'rgba(161, 161, 170, 0.3)';
    const offsetX = (vp.width / 2 - cam.x * cam.zoom) % dotSpacing;
    const offsetY = (vp.height / 2 - cam.y * cam.zoom) % dotSpacing;
    for (let x = offsetX; x < vp.width; x += dotSpacing) {
      for (let y = offsetY; y < vp.height; y += dotSpacing) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // Calcula coordenadas da grade no canvas
    const screenOrigin = worldToScreen(0, 0, cam);
    const gridWidthPx = GRID_SIZE * cam.zoom;
    const gridHeightPx = GRID_SIZE * cam.zoom;

    // Sombra suave da folha de 1000x1000
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(screenOrigin.x, screenOrigin.y, gridWidthPx, gridHeightPx);
    ctx.restore();

    // Bounding box visível no mundo para culling
    const wLeft = Math.max(0, screenToWorld(0, 0, cam).x);
    const wRight = Math.min(GRID_SIZE, screenToWorld(vp.width, 0, cam).x);
    const wTop = Math.max(0, screenToWorld(0, 0, cam).y);
    const wBottom = Math.min(GRID_SIZE, screenToWorld(0, vp.height, cam).y);

    // 1. DESENHO DOS BLOCOS OCUPADOS (PUBLICADOS, EM ANÁLISE, RESERVADOS)
    const imageCache = imageCacheRef.current;

    for (const block of blocks) {
      // Culling: desenha apenas se intersectar a viewport visível
      if (
        block.x + block.w < wLeft ||
        block.x > wRight ||
        block.y + block.h < wTop ||
        block.y > wBottom
      ) {
        continue;
      }

      const bScreen = worldToScreen(block.x, block.y, cam);
      const bW = block.w * cam.zoom;
      const bH = block.h * cam.zoom;

      if (block.state === 'published') {
        // Bloco Publicado com imagem
        const img = block.imageUrl ? imageCache.get(block.imageUrl) : null;
        if (img && img.complete && img.naturalWidth > 0) {
          // Imagem nova (grande) fica suave; anúncio antigo de 1 px por pixel fica nítido
          ctx.imageSmoothingEnabled = img.naturalWidth >= block.w * SMOOTH_MIN_SCALE;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, bScreen.x, bScreen.y, bW, bH);
        } else {
          // Fallback elegante enquanto a imagem carrega
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(bScreen.x, bScreen.y, bW, bH);
          ctx.fillStyle = '#94a3b8';
          const dotSize = Math.max(2, Math.min(6, Math.min(bW, bH) * 0.25));
          ctx.beginPath();
          ctx.arc(bScreen.x + bW / 2, bScreen.y + bH / 2, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
        // Borda sutil nos blocos publicados
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.22)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bScreen.x, bScreen.y, bW, bH);
      } else if (block.state === 'in_review') {
        // Bloco Vendido, em análise (tom âmbar translúcido com listras diagonais)
        ctx.save();
        ctx.beginPath();
        ctx.rect(bScreen.x, bScreen.y, bW, bH);
        ctx.clip();

        // Fundo âmbar translúcido
        ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
        ctx.fillRect(bScreen.x, bScreen.y, bW, bH);

        // Listras diagonais
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
        ctx.lineWidth = Math.max(1, 1.2 * (cam.zoom >= 2 ? 1.5 : 1));
        ctx.beginPath();
        const stripeStep = Math.max(6, 8 * cam.zoom * 0.5);
        for (let d = -bH; d < bW + bH; d += stripeStep) {
          ctx.moveTo(bScreen.x + d, bScreen.y);
          ctx.lineTo(bScreen.x + d + bH, bScreen.y + bH);
        }
        ctx.stroke();
        ctx.restore();

        // Borda âmbar nítida
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(bScreen.x, bScreen.y, bW, bH);
      } else if (block.state === 'reserved') {
        // Bloco Reservado (aguardando pagamento) - tom roxo/ciano com borda tracejada
        ctx.save();
        ctx.fillStyle = 'rgba(147, 51, 234, 0.16)';
        ctx.fillRect(bScreen.x, bScreen.y, bW, bH);

        ctx.strokeStyle = '#9333ea';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(bScreen.x, bScreen.y, bW, bH);
        ctx.restore();
      }
    }

    // 2. GRID LINES (LINHAS DE REFERÊNCIA)
    if (wLeft < wRight && wTop < wBottom) {
      // Linhas finas de 5 em 5 pixels (blocos mínimos de R$ 25)
      if (cam.zoom >= 1.2) {
        const opacity = Math.min(0.08, (cam.zoom - 1.2) * 0.04);
        ctx.strokeStyle = `rgba(100, 116, 139, ${opacity.toFixed(3)})`;
        ctx.lineWidth = 1;

        ctx.beginPath();
        const start5X = Math.floor(wLeft / 5) * 5;
        const end5X = Math.ceil(wRight / 5) * 5;
        for (let wx = start5X; wx <= end5X; wx += 5) {
          if (wx % 50 === 0) continue;
          const sx = Math.round(worldToScreen(wx, 0, cam).x) + 0.5;
          const syTop = Math.max(screenOrigin.y, 0);
          const syBottom = Math.min(screenOrigin.y + gridHeightPx, vp.height);
          ctx.moveTo(sx, syTop);
          ctx.lineTo(sx, syBottom);
        }

        const start5Y = Math.floor(wTop / 5) * 5;
        const end5Y = Math.ceil(wBottom / 5) * 5;
        for (let wy = start5Y; wy <= end5Y; wy += 5) {
          if (wy % 50 === 0) continue;
          const sy = Math.round(worldToScreen(0, wy, cam).y) + 0.5;
          const sxLeft = Math.max(screenOrigin.x, 0);
          const sxRight = Math.min(screenOrigin.x + gridWidthPx, vp.width);
          ctx.moveTo(sxLeft, sy);
          ctx.lineTo(sxRight, sy);
        }
        ctx.stroke();
      }

      // Linhas de referência a cada 50 pixels
      if (cam.zoom >= 0.4) {
        ctx.strokeStyle = 'rgba(106, 51, 120, 0.07)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        const start50X = Math.floor(wLeft / 50) * 50;
        const end50X = Math.ceil(wRight / 50) * 50;
        for (let wx = start50X; wx <= end50X; wx += 50) {
          if (wx % 100 === 0 || wx === 0 || wx === GRID_SIZE) continue;
          const sx = Math.round(worldToScreen(wx, 0, cam).x) + 0.5;
          const syTop = Math.max(screenOrigin.y, 0);
          const syBottom = Math.min(screenOrigin.y + gridHeightPx, vp.height);
          ctx.moveTo(sx, syTop);
          ctx.lineTo(sx, syBottom);
        }

        const start50Y = Math.floor(wTop / 50) * 50;
        const end50Y = Math.ceil(wBottom / 50) * 50;
        for (let wy = start50Y; wy <= end50Y; wy += 50) {
          if (wy % 100 === 0 || wy === 0 || wy === GRID_SIZE) continue;
          const sy = Math.round(worldToScreen(0, wy, cam).y) + 0.5;
          const sxLeft = Math.max(screenOrigin.x, 0);
          const sxRight = Math.min(screenOrigin.x + gridWidthPx, vp.width);
          ctx.moveTo(sxLeft, sy);
          ctx.lineTo(sxRight, sy);
        }
        ctx.stroke();
      }

      // Linhas principais a cada 100 pixels
      ctx.strokeStyle = 'rgba(106, 51, 120, 0.12)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      const start100X = Math.floor(wLeft / 100) * 100;
      const end100X = Math.ceil(wRight / 100) * 100;
      for (let wx = start100X; wx <= end100X; wx += 100) {
        if (wx === 0 || wx === GRID_SIZE) continue;
        const sx = Math.round(worldToScreen(wx, 0, cam).x) + 0.5;
        const syTop = Math.max(screenOrigin.y, 0);
        const syBottom = Math.min(screenOrigin.y + gridHeightPx, vp.height);
        ctx.moveTo(sx, syTop);
        ctx.lineTo(sx, syBottom);
      }

      const start100Y = Math.floor(wTop / 100) * 100;
      const end100Y = Math.ceil(wBottom / 100) * 100;
      for (let wy = start100Y; wy <= end100Y; wy += 100) {
        if (wy === 0 || wy === GRID_SIZE) continue;
        const sy = Math.round(worldToScreen(0, wy, cam).y) + 0.5;
        const sxLeft = Math.max(screenOrigin.x, 0);
        const sxRight = Math.min(screenOrigin.x + gridWidthPx, vp.width);
        ctx.moveTo(sxLeft, sy);
        ctx.lineTo(sxRight, sy);
      }
      ctx.stroke();
    }

    // 3. EIXOS CENTRAIS (500, 500)
    const centerScreen = worldToScreen(500, 500, cam);
    ctx.strokeStyle = 'rgba(106, 51, 120, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(centerScreen.x, Math.max(screenOrigin.y, 0));
    ctx.lineTo(centerScreen.x, Math.min(screenOrigin.y + gridHeightPx, vp.height));
    ctx.moveTo(Math.max(screenOrigin.x, 0), centerScreen.y);
    ctx.lineTo(Math.min(screenOrigin.x + gridWidthPx, vp.width), centerScreen.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. DESTAQUE DO SNAP 5×5 SOB O CURSOR (ESPAÇO LIVRE)
    if (hoveredFreeCell && cursorCoord.inside && !isDraggingRef.current) {
      const snapScreen = worldToScreen(hoveredFreeCell.x, hoveredFreeCell.y, cam);
      const snapSize = BLOCK_SIZE * cam.zoom;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
      ctx.fillRect(snapScreen.x, snapScreen.y, snapSize, snapSize);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
      ctx.lineWidth = Math.max(1, cam.zoom * 0.15);
      ctx.strokeRect(snapScreen.x, snapScreen.y, snapSize, snapSize);
    }

    // 5. ÁREA SELECIONADA PELO USUÁRIO COM ALÇAS E DIMENSÕES
    if (selectedArea) {
      const bScreen = worldToScreen(selectedArea.x, selectedArea.y, cam);
      const bW = selectedArea.w * cam.zoom;
      const bH = selectedArea.h * cam.zoom;

      // Preview da imagem do anuncio recortada ou preenchimento padrao
      const previewImg = previewImageRef.current;
      if (previewImg && previewImg.complete) {
        ctx.imageSmoothingEnabled = previewImg.naturalWidth >= selectedArea.w * SMOOTH_MIN_SCALE;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(previewImg, bScreen.x, bScreen.y, bW, bH);
      } else {
        ctx.fillStyle = 'rgba(106, 51, 120, 0.22)';
        ctx.fillRect(bScreen.x, bScreen.y, bW, bH);
      }

      // Grade interna 5x5 quando houver zoom suficiente
      if (cam.zoom >= 0.85 && (bW > 16 || bH > 16)) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(bScreen.x, bScreen.y, bW, bH);
        ctx.clip();

        ctx.strokeStyle = 'rgba(252, 217, 83, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let wx = selectedArea.x + 5; wx < selectedArea.x + selectedArea.w; wx += 5) {
          const sx = Math.round(worldToScreen(wx, 0, cam).x) + 0.5;
          ctx.moveTo(sx, bScreen.y);
          ctx.lineTo(sx, bScreen.y + bH);
        }
        for (let wy = selectedArea.y + 5; wy < selectedArea.y + selectedArea.h; wy += 5) {
          const sy = Math.round(worldToScreen(0, wy, cam).y) + 0.5;
          ctx.moveTo(bScreen.x, sy);
          ctx.lineTo(bScreen.x + bW, sy);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Borda principal sólida
      ctx.strokeStyle = '#6A3378';
      ctx.lineWidth = Math.max(2, Math.min(3.5, cam.zoom * 0.35));
      ctx.strokeRect(bScreen.x, bScreen.y, bW, bH);

      // Borda interna tracejada dourada
      ctx.save();
      ctx.strokeStyle = '#FCD953';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(bScreen.x + 1, bScreen.y + 1, Math.max(0, bW - 2), Math.max(0, bH - 2));
      ctx.restore();

      // Alças de redimensionamento nos 4 cantos e 4 lados
      const drawCornerHandle = (hx: number, hy: number) => {
        const size = Math.max(8, Math.min(12, 10));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx - size / 2, hy - size / 2, size, size);
        ctx.strokeStyle = '#6A3378';
        ctx.lineWidth = 2;
        ctx.strokeRect(hx - size / 2, hy - size / 2, size, size);
        ctx.fillStyle = '#FCD953';
        ctx.fillRect(hx - size / 4, hy - size / 4, size / 2, size / 2);
      };

      const drawEdgeHandle = (hx: number, hy: number, isVertical: boolean) => {
        const w = isVertical ? 6 : 12;
        const h = isVertical ? 12 : 6;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx - w / 2, hy - h / 2, w, h);
        ctx.strokeStyle = '#6A3378';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hx - w / 2, hy - h / 2, w, h);
        ctx.fillStyle = '#FCD953';
        ctx.fillRect(hx - (w - 4) / 2, hy - (h - 4) / 2, Math.max(1, w - 4), Math.max(1, h - 4));
      };

      // 4 cantos
      drawCornerHandle(bScreen.x, bScreen.y); // NW
      drawCornerHandle(bScreen.x + bW, bScreen.y); // NE
      drawCornerHandle(bScreen.x + bW, bScreen.y + bH); // SE
      drawCornerHandle(bScreen.x, bScreen.y + bH); // SW

      // 4 bordas (quando largura/altura permitir)
      if (bW > 24) {
        drawEdgeHandle(bScreen.x + bW / 2, bScreen.y, false); // N
        drawEdgeHandle(bScreen.x + bW / 2, bScreen.y + bH, false); // S
      }
      if (bH > 24) {
        drawEdgeHandle(bScreen.x, bScreen.y + bH / 2, true); // W
        drawEdgeHandle(bScreen.x + bW, bScreen.y + bH / 2, true); // E
      }

      // Rótulo flutuante com dimensões e valor em R$
      const pixelsCount = selectedArea.w * selectedArea.h;
      const labelText = `${selectedArea.w}×${selectedArea.h} px • R$ ${pixelsCount.toLocaleString('pt-BR')}`;
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const badgeW = textMetrics.width + 16;
      const badgeH = 22;
      const badgeX = bScreen.x + bW / 2 - badgeW / 2;
      let badgeY = bScreen.y - badgeH - 8;
      if (badgeY < 50) {
        badgeY = bScreen.y + bH + 8;
      }

      ctx.save();
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();
      ctx.strokeStyle = '#FCD953';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#FCD953';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, badgeX + badgeW / 2, badgeY + badgeH / 2);
      ctx.restore();
    }

    // 6. BORDA EXTERNA DELIMITANDO OS 1000×1000 PIXELS
    ctx.strokeStyle = '#6A3378';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(screenOrigin.x, screenOrigin.y, gridWidthPx, gridHeightPx);

    // Cantos destacados da folha
    const corners = [
      [screenOrigin.x, screenOrigin.y],
      [screenOrigin.x + gridWidthPx, screenOrigin.y],
      [screenOrigin.x, screenOrigin.y + gridHeightPx],
      [screenOrigin.x + gridWidthPx, screenOrigin.y + gridHeightPx],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#FCD953';
      ctx.fill();
    }
  }, [screenToWorld, worldToScreen, selectedArea, hoveredFreeCell, cursorCoord.inside, blocks]);

  // Ref estável para efeitos que não devem re-executar quando renderCanvas muda (hover/seleção)
  const renderCanvasRef = useRef<() => void>(() => {});
  useEffect(() => {
    renderCanvasRef.current = renderCanvas;
  }, [renderCanvas]);

  // Redesenha sempre que o estado visual (hover, seleção, blocos) muda
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Atualiza preview de recorte no bloco selecionado quando o usuário envia imagem
  useEffect(() => {
    if (!previewDataUrl) {
      previewImageRef.current = null;
      renderCanvas();
      return;
    }
    const img = new Image();
    img.src = previewDataUrl;
    img.onload = () => {
      previewImageRef.current = img;
      renderCanvas();
    };
  }, [previewDataUrl, renderCanvas]);

  // Loop de Animação e Inércia
  useEffect(() => {
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const dt = Math.min(timestamp - lastTimestamp, 32);
      lastTimestamp = timestamp;

      // Executa inércia se solto e com velocidade
      const v = velocityRef.current;
      if (!isDraggingRef.current && !isTransitioningRef.current && (Math.abs(v.vx) > 0.005 || Math.abs(v.vy) > 0.005)) {
        const cam = cameraRef.current;
        cam.x += v.vx * (dt / 16.67);
        cam.y += v.vy * (dt / 16.67);

        // Amortecimento por atrito
        const friction = Math.pow(0.92, dt / 16.67);
        v.vx *= friction;
        v.vy *= friction;

        // Limita e desacelera suavemente nas bordas
        const clamped = clampCameraPosition(cam.x, cam.y);
        if (cam.x !== clamped.x) v.vx *= 0.5;
        if (cam.y !== clamped.y) v.vy *= 0.5;
        cam.x = clamped.x;
        cam.y = clamped.y;

        renderCanvas();
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [clampCameraPosition, renderCanvas]);

  // Redimensionamento responsivo e Retina (DPR)
  const handleResize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    viewportRef.current = { width, height };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    renderCanvasRef.current();
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Inicializa a visão centralizada em (500, 500)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      const initialZoom = focus ? FOCUS_ZOOM : w < 640 ? 0.95 : 1.2;
      cameraRef.current = focus
        ? { x: focus.x, y: focus.y, zoom: initialZoom }
        : { x: 500, y: 500, zoom: initialZoom };
      setZoomDisplay(Math.round(initialZoom * 100));
      renderCanvasRef.current();
    }
  }, []); // só na montagem

  // Sem foco na URL: enquadra os anúncios no ar uma única vez, se o visitante ainda não mexeu na câmera
  const initialFitDoneRef = useRef<boolean>(false);
  const userMovedCameraRef = useRef<boolean>(false);
  useEffect(() => {
    if (focus || initialFitDoneRef.current || userMovedCameraRef.current) return;
    const liveAds = blocks.filter((block) => block.state === 'published');
    const vp = viewportRef.current;
    if (vp.width === 0 || vp.height === 0) return;
    const fit = fitCameraToAds(liveAds, vp, { minZoom: getMinZoom(), maxZoom: MAX_ZOOM });
    if (!fit) return;
    initialFitDoneRef.current = true;
    cameraRef.current = fit;
    setZoomDisplay(Math.round(fit.zoom * 100));
    renderCanvasRef.current();
  }, [blocks, focus, getMinZoom]);

  // Transição suave para um ponto e zoom
  const smoothAnimateTo = useCallback(
    (targetX: number, targetY: number, targetZoom: number, duration = 400) => {
      isTransitioningRef.current = true;
      userMovedCameraRef.current = true;
      velocityRef.current = { vx: 0, vy: 0 };

      const startX = cameraRef.current.x;
      const startY = cameraRef.current.y;
      const startZoom = cameraRef.current.zoom;
      const startTime = performance.now();

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        cameraRef.current.x = startX + (targetX - startX) * eased;
        cameraRef.current.y = startY + (targetY - startY) * eased;
        cameraRef.current.zoom = startZoom + (targetZoom - startZoom) * eased;
        setZoomDisplay(Math.round(cameraRef.current.zoom * 100));

        renderCanvas();

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          isTransitioningRef.current = false;
        }
      };

      requestAnimationFrame(step);
    },
    [renderCanvas]
  );

  // Ação: Voltar ao centro (500, 500)
  const handleResetCenter = useCallback(() => {
    const vp = viewportRef.current;
    const defaultZoom = vp.width < 640 ? 0.95 : 1.2;
    smoothAnimateTo(500, 500, defaultZoom);
    setCursorCoord({ x: 500, y: 500, inside: true });
  }, [smoothAnimateTo]);

  // Ações de Zoom (+ / -)
  const handleZoomChange = useCallback(
    (factor: number) => {
      const minZoom = getMinZoom();
      const current = cameraRef.current.zoom;
      const newZoom = Math.max(minZoom, Math.min(MAX_ZOOM, current * factor));
      smoothAnimateTo(cameraRef.current.x, cameraRef.current.y, newZoom, 250);
    },
    [getMinZoom, smoothAnimateTo]
  );

  // Manipuladores de Ponteiro (Mouse & Touch Unificados)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isTransitioningRef.current = false;
    canvasRef.current?.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pointerDistanceTraveledRef.current = 0;

    if (activePointersRef.current.size === 1) {
      const curArea = selectedAreaRef.current;
      const hit = curArea ? getHandleHit(e.clientX, e.clientY, curArea, cameraRef.current, viewportRef.current) : null;

      dragStartScreenRef.current = { x: e.clientX, y: e.clientY };
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      lastPointerTimeRef.current = performance.now();
      velocityRef.current = { vx: 0, vy: 0 };

      if (hit) {
        interactionModeRef.current = hit;
        dragStartAreaRef.current = curArea ? { ...curArea } : null;
        dragStartWorldPointRef.current = screenToWorld(e.clientX, e.clientY);
        isDraggingRef.current = false;
      } else {
        interactionModeRef.current = 'pan';
        userMovedCameraRef.current = true;
        isDraggingRef.current = true;
        dragStartCamRef.current = { x: cameraRef.current.x, y: cameraRef.current.y };
      }
    } else if (activePointersRef.current.size === 2) {
      // Inicia Pinch
      interactionModeRef.current = 'pinch';
      userMovedCameraRef.current = true;
      isDraggingRef.current = false;
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = cameraRef.current.zoom;
      pinchStartCenterRef.current = {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
      pinchStartCamRef.current = { x: cameraRef.current.x, y: cameraRef.current.y };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const active = activePointersRef.current;
    if (active.has(e.pointerId)) {
      active.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const dxScreen = e.clientX - lastPointerPosRef.current.x;
    const dyScreen = e.clientY - lastPointerPosRef.current.y;
    pointerDistanceTraveledRef.current += Math.hypot(dxScreen, dyScreen);

    // Ponto no mundo
    const worldPoint = screenToWorld(e.clientX, e.clientY);
    const alignedX = Math.floor(worldPoint.x / BLOCK_SIZE) * BLOCK_SIZE;
    const alignedY = Math.floor(worldPoint.y / BLOCK_SIZE) * BLOCK_SIZE;
    const inside = alignedX >= 0 && alignedX < GRID_SIZE && alignedY >= 0 && alignedY < GRID_SIZE;
    setCursorCoord({ x: alignedX, y: alignedY, inside });

    // Detecção de bloco ocupado vs espaço livre para tooltips e feedback de snap
    if (inside && active.size === 0) {
      const curArea = selectedAreaRef.current;
      const hit = curArea ? getHandleHit(e.clientX, e.clientY, curArea, cameraRef.current, viewportRef.current) : null;
      setHoverHandle(hit);

      if (canvasRef.current) {
        if (hit === 'nw' || hit === 'se') canvasRef.current.style.cursor = 'nwse-resize';
        else if (hit === 'ne' || hit === 'sw') canvasRef.current.style.cursor = 'nesw-resize';
        else if (hit === 'n' || hit === 's') canvasRef.current.style.cursor = 'ns-resize';
        else if (hit === 'e' || hit === 'w') canvasRef.current.style.cursor = 'ew-resize';
        else if (hit === 'move') canvasRef.current.style.cursor = 'move';
        else {
          const found = blocksRef.current.find(b => worldPoint.x >= b.x && worldPoint.x < b.x + b.w && worldPoint.y >= b.y && worldPoint.y < b.y + b.h);
          if (found && found.state === 'published') {
            canvasRef.current.style.cursor = 'pointer';
          } else {
            canvasRef.current.style.cursor = 'grab';
          }
        }
      }

      const foundBlock = blocksRef.current.find(
        (b) =>
          worldPoint.x >= b.x &&
          worldPoint.x < b.x + b.w &&
          worldPoint.y >= b.y &&
          worldPoint.y < b.y + b.h
      );

      if (foundBlock) {
        setHoveredBlock({
          block: foundBlock,
          screenX: e.clientX,
          screenY: e.clientY,
        });
        setHoveredFreeCell(null);
      } else {
        setHoveredBlock(null);
        setHoveredFreeCell({
          x: alignedX,
          y: alignedY,
          screenX: e.clientX,
          screenY: e.clientY,
        });
      }
    } else if (!inside) {
      setHoveredBlock(null);
      setHoveredFreeCell(null);
    }

    // Redimensionamento ou deslocamento direto da seleção
    const mode = interactionModeRef.current;
    if (mode && mode !== 'pan' && mode !== 'pinch' && dragStartAreaRef.current) {
      if (canvasRef.current) {
        if (mode === 'move') canvasRef.current.style.cursor = 'move';
        else if (mode === 'nw' || mode === 'se') canvasRef.current.style.cursor = 'nwse-resize';
        else if (mode === 'ne' || mode === 'sw') canvasRef.current.style.cursor = 'nesw-resize';
        else if (mode === 'n' || mode === 's') canvasRef.current.style.cursor = 'ns-resize';
        else if (mode === 'e' || mode === 'w') canvasRef.current.style.cursor = 'ew-resize';
      }

      const curWorld = screenToWorld(e.clientX, e.clientY);
      const rawDx = curWorld.x - dragStartWorldPointRef.current.x;
      const rawDy = curWorld.y - dragStartWorldPointRef.current.y;
      const snapDx = Math.round(rawDx / BLOCK_SIZE) * BLOCK_SIZE;
      const snapDy = Math.round(rawDy / BLOCK_SIZE) * BLOCK_SIZE;

      const start = dragStartAreaRef.current;
      let candX = start.x;
      let candY = start.y;
      let candW = start.w;
      let candH = start.h;

      switch (mode) {
        case 'move':
          candX = start.x + snapDx;
          candY = start.y + snapDy;
          break;
        case 'e':
          candW = Math.max(BLOCK_SIZE, start.w + snapDx);
          break;
        case 'w':
          candW = Math.max(BLOCK_SIZE, start.w - snapDx);
          candX = start.x + (start.w - candW);
          break;
        case 's':
          candH = Math.max(BLOCK_SIZE, start.h + snapDy);
          break;
        case 'n':
          candH = Math.max(BLOCK_SIZE, start.h - snapDy);
          candY = start.y + (start.h - candH);
          break;
        case 'se':
          candW = Math.max(BLOCK_SIZE, start.w + snapDx);
          candH = Math.max(BLOCK_SIZE, start.h + snapDy);
          break;
        case 'sw':
          candW = Math.max(BLOCK_SIZE, start.w - snapDx);
          candX = start.x + (start.w - candW);
          candH = Math.max(BLOCK_SIZE, start.h + snapDy);
          break;
        case 'ne':
          candW = Math.max(BLOCK_SIZE, start.w + snapDx);
          candH = Math.max(BLOCK_SIZE, start.h - snapDy);
          candY = start.y + (start.h - candH);
          break;
        case 'nw':
          candW = Math.max(BLOCK_SIZE, start.w - snapDx);
          candX = start.x + (start.w - candW);
          candH = Math.max(BLOCK_SIZE, start.h - snapDy);
          candY = start.y + (start.h - candH);
          break;
      }

      // Clamping nos limites 0..1000
      candX = Math.max(0, Math.min(GRID_SIZE - candW, candX));
      candY = Math.max(0, Math.min(GRID_SIZE - candH, candY));
      if (candX + candW > GRID_SIZE) candW = GRID_SIZE - candX;
      if (candY + candH > GRID_SIZE) candH = GRID_SIZE - candY;

      // Validação de colisão em tempo real
      if (isAreaFree(candX, candY, candW, candH, blocksRef.current)) {
        setSelectedArea({ x: candX, y: candY, w: candW, h: candH });
        setCollisionWarning(null);
      } else {
        // Tenta encolher gradualmente até a borda livre mais próxima
        let found = false;
        if (mode === 'e' || mode === 'ne') {
          for (let testW = candW - BLOCK_SIZE; testW >= start.w; testW -= BLOCK_SIZE) {
            if (isAreaFree(candX, candY, testW, candH, blocksRef.current)) {
              candW = testW;
              found = true;
              break;
            }
          }
        } else if (mode === 's' || mode === 'sw') {
          for (let testH = candH - BLOCK_SIZE; testH >= start.h; testH -= BLOCK_SIZE) {
            if (isAreaFree(candX, candY, candW, testH, blocksRef.current)) {
              candH = testH;
              found = true;
              break;
            }
          }
        } else if (mode === 'se') {
          for (let testW = candW - BLOCK_SIZE; testW >= start.w; testW -= BLOCK_SIZE) {
            if (isAreaFree(candX, candY, testW, candH, blocksRef.current)) {
              candW = testW;
              found = true;
              break;
            }
          }
          if (!found) {
            for (let testH = candH - BLOCK_SIZE; testH >= start.h; testH -= BLOCK_SIZE) {
              if (isAreaFree(candX, candY, candW, testH, blocksRef.current)) {
                candH = testH;
                found = true;
                break;
              }
            }
          }
        }
        if (found) {
          setSelectedArea({ x: candX, y: candY, w: candW, h: candH });
        } else {
          setCollisionWarning('Espaço ocupado ao lado — escolha outra posição ou tamanho menor');
        }
      }

      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      renderCanvas();
      return;
    }

    // Drag com 1 ponteiro (Pan do canvas)
    if (isDraggingRef.current && mode === 'pan' && active.size === 1) {
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      const now = performance.now();
      const dt = Math.max(now - lastPointerTimeRef.current, 1);

      // Fecha o banner de boas-vindas automaticamente quando o usuário começar a arrastar
      if (showWelcomeRef.current && pointerDistanceTraveledRef.current > 10) {
        dismissWelcome();
      }

      const cam = cameraRef.current;
      cam.x = clampCameraPosition(cam.x - dxScreen / cam.zoom, cam.y - dyScreen / cam.zoom).x;
      cam.y = clampCameraPosition(cam.x, cam.y - dyScreen / cam.zoom).y;

      // Calcula velocidade para inércia
      const instVx = -(dxScreen / cam.zoom) / (dt / 16.67);
      const instVy = -(dyScreen / cam.zoom) / (dt / 16.67);
      velocityRef.current = {
        vx: 0.6 * velocityRef.current.vx + 0.4 * instVx,
        vy: 0.6 * velocityRef.current.vy + 0.4 * instVy,
      };

      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      lastPointerTimeRef.current = now;

      renderCanvas();
    } else if (active.size === 2) {
      // Pinch com 2 ponteiros
      const pts = Array.from(active.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchStartDistRef.current > 0) {
        const factor = currentDist / pinchStartDistRef.current;
        const minZoom = getMinZoom();
        const newZoom = Math.max(minZoom, Math.min(MAX_ZOOM, pinchStartZoomRef.current * factor));

        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        const vp = viewportRef.current;

        const worldFocusX = (midX - vp.width / 2) / pinchStartZoomRef.current + pinchStartCamRef.current.x;
        const worldFocusY = (midY - vp.height / 2) / pinchStartZoomRef.current + pinchStartCamRef.current.y;

        cameraRef.current.zoom = newZoom;
        cameraRef.current.x = clampCameraPosition(
          worldFocusX - (midX - vp.width / 2) / newZoom,
          worldFocusY - (midY - vp.height / 2) / newZoom
        ).x;
        cameraRef.current.y = clampCameraPosition(
          cameraRef.current.x,
          worldFocusY - (midY - vp.height / 2) / newZoom
        ).y;

        setZoomDisplay(Math.round(newZoom * 100));
        renderCanvas();
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);

    // Se foi apenas um clique sem arrastar
    if (pointerDistanceTraveledRef.current < 6) {
      setTouchCard(null);
      const worldPoint = screenToWorld(e.clientX, e.clientY);
      const blockX = Math.floor(worldPoint.x / BLOCK_SIZE) * BLOCK_SIZE;
      const blockY = Math.floor(worldPoint.y / BLOCK_SIZE) * BLOCK_SIZE;

      if (blockX >= 0 && blockX < GRID_SIZE && blockY >= 0 && blockY < GRID_SIZE) {
        // Verifica se clicou em um bloco ocupado
        const clickedBlock = blocksRef.current.find(
          (b) =>
            worldPoint.x >= b.x &&
            worldPoint.x < b.x + b.w &&
            worldPoint.y >= b.y &&
            worldPoint.y < b.y + b.h
        );

        if (clickedBlock) {
          if (clickedBlock.state === 'published' && e.pointerType === 'touch') {
            // Toque: primeiro mostra o card com a imagem ampliada e o botão "Visitar site"
            setTouchCard({ block: clickedBlock, screenX: e.clientX, screenY: e.clientY });
          } else if (clickedBlock.state === 'published' && clickedBlock.linkUrl) {
            window.open(clickedBlock.linkUrl, '_blank', 'noopener,noreferrer');
          } else if (clickedBlock.state === 'in_review') {
            setNotification({
              type: 'warning',
              message: 'Este espaço já foi adquirido e está em análise de moderação.',
            });
          } else if (clickedBlock.state === 'reserved') {
            setNotification({
              type: 'warning',
              message: 'Este espaço está reservado (aguardando pagamento via Pix).',
            });
          }
        } else {
          // Espaço livre: seleciona na coordenada encaixada na grade 5x5
          const cur = selectedAreaRef.current;
          const targetW = cur ? cur.w : 10;
          const targetH = cur ? cur.h : 10;

          if (isAreaFree(blockX, blockY, targetW, targetH, blocksRef.current)) {
            setSelectedArea({ x: blockX, y: blockY, w: targetW, h: targetH });
          } else if (isAreaFree(blockX, blockY, 10, 10, blocksRef.current)) {
            setSelectedArea({ x: blockX, y: blockY, w: 10, h: 10 });
          } else if (isAreaFree(blockX, blockY, 5, 5, blocksRef.current)) {
            setSelectedArea({ x: blockX, y: blockY, w: 5, h: 5 });
          } else {
            setCollisionWarning('Espaço indisponível neste ponto.');
          }
          renderCanvas();
        }
      }
    }

    if (activePointersRef.current.size === 0) {
      isDraggingRef.current = false;
      interactionModeRef.current = null;
      dragStartAreaRef.current = null;
    }
  };

  // Aplica preset rápido validando colisão e limites
  const applyPreset = useCallback((presetW: number, presetH: number) => {
    const cur = selectedAreaRef.current;
    if (!cur) {
      const free = findFreeBlockNear(500, 500, presetW, presetH, blocksRef.current);
      setSelectedArea(free);
      return;
    }

    let candX = cur.x;
    let candY = cur.y;
    if (candX + presetW > GRID_SIZE) candX = GRID_SIZE - presetW;
    if (candY + presetH > GRID_SIZE) candY = GRID_SIZE - presetH;

    if (isAreaFree(candX, candY, presetW, presetH, blocksRef.current)) {
      setSelectedArea({ x: candX, y: candY, w: presetW, h: presetH });
      setCollisionWarning(null);
      return;
    }

    // Tenta desvios suaves caso a coordenada atual colida
    let placed = false;
    for (let r = 5; r <= 30; r += 5) {
      for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r], [0, r], [-r, -r], [r, r]]) {
        const testX = Math.max(0, Math.min(GRID_SIZE - presetW, candX + dx));
        const testY = Math.max(0, Math.min(GRID_SIZE - presetH, candY + dy));
        if (isAreaFree(testX, testY, presetW, presetH, blocksRef.current)) {
          setSelectedArea({ x: testX, y: testY, w: presetW, h: presetH });
          setCollisionWarning(null);
          placed = true;
          break;
        }
      }
      if (placed) break;
    }

    if (!placed) {
      setCollisionWarning('Espaço ocupado ao lado — escolha outra posição ou tamanho menor');
    }
  }, []);

  // Ajusta dimensões ou posições em múltiplos de 5 com validação de colisão
  const adjustDimension = useCallback((type: 'w' | 'h' | 'x' | 'y', delta: number) => {
    const cur = selectedAreaRef.current;
    if (!cur) return;

    if (type === 'w') {
      const candW = Math.max(5, cur.w + delta);
      if (cur.x + candW > GRID_SIZE) {
        setCollisionWarning('Limite da grade atingido à direita');
        return;
      }
      if (isAreaFree(cur.x, cur.y, candW, cur.h, blocksRef.current)) {
        setSelectedArea({ ...cur, w: candW });
        setCollisionWarning(null);
      } else {
        setCollisionWarning('Espaço ocupado ao lado — escolha outra posição ou tamanho menor');
      }
    } else if (type === 'h') {
      const candH = Math.max(5, cur.h + delta);
      if (cur.y + candH > GRID_SIZE) {
        setCollisionWarning('Limite inferior da grade atingido');
        return;
      }
      if (isAreaFree(cur.x, cur.y, cur.w, candH, blocksRef.current)) {
        setSelectedArea({ ...cur, h: candH });
        setCollisionWarning(null);
      } else {
        setCollisionWarning('Espaço ocupado ao lado — escolha outra posição ou tamanho menor');
      }
    } else if (type === 'x') {
      const candX = Math.max(0, Math.min(GRID_SIZE - cur.w, cur.x + delta));
      if (isAreaFree(candX, cur.y, cur.w, cur.h, blocksRef.current)) {
        setSelectedArea({ ...cur, x: candX });
        setCollisionWarning(null);
      } else {
        setCollisionWarning('Espaço ocupado ao lado — escolha outra posição');
      }
    } else if (type === 'y') {
      const candY = Math.max(0, Math.min(GRID_SIZE - cur.h, cur.y + delta));
      if (isAreaFree(cur.x, candY, cur.w, cur.h, blocksRef.current)) {
        setSelectedArea({ ...cur, y: candY });
        setCollisionWarning(null);
      } else {
        setCollisionWarning('Espaço ocupado ao lado — escolha outra posição');
      }
    }
  }, []);

  // Ajuste fino de dimensoes do bloco via BuyPanel em passos de 5px
  const handleResizeStep = useCallback((axis: 'w' | 'h', delta: number) => {
    if (!selectedAreaRef.current) return;
    const cur = selectedAreaRef.current;
    const nextW = axis === 'w' ? cur.w + delta : cur.w;
    const nextH = axis === 'h' ? cur.h + delta : cur.h;

    if (nextW < 5 || nextH < 5 || cur.x + nextW > 1000 || cur.y + nextH > 1000) {
      setCollisionWarning('Limite da grade atingido');
      return;
    }

    if (isAreaFree(cur.x, cur.y, nextW, nextH, blocksRef.current)) {
      setSelectedArea({ ...cur, w: nextW, h: nextH });
      setCollisionWarning(null);
    } else {
      setCollisionWarning('Espaco ocupado ao lado');
    }
  }, []);

  const handleOpenBuyPanel = useCallback(() => {
    if (selectedAreaRef.current) {
      trackBlocoSelecionado({
        pixels: selectedAreaRef.current.w * selectedAreaRef.current.h,
        x: selectedAreaRef.current.x,
        y: selectedAreaRef.current.y,
      });
    }
    setBuyPanelOpen(true);
  }, []);

  // Ação principal: Botão CTA "Comprar pixels"
  const handleCtaBuyPixels = useCallback(() => {
    if (!selectedAreaRef.current) {
      const start = selectionStartFromCamera(cameraRef.current, 10, 10);
      const freeArea = findFreeBlockNear(start.x, start.y, 10, 10, blocksRef.current);
      setSelectedArea(freeArea);
      const centerX = freeArea.x + freeArea.w / 2;
      const centerY = freeArea.y + freeArea.h / 2;
      smoothAnimateTo(centerX, centerY, 2.4, 450);
    } else {
      handleOpenBuyPanel();
    }
  }, [smoothAnimateTo, handleOpenBuyPanel]);

  const chooseSpaceFromWelcome = useCallback(() => {
    handleCtaBuyPixels();
    dismissWelcome();
  }, [handleCtaBuyPixels, dismissWelcome]);

  // Zoom pelo mouse wheel focado no cursor
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      userMovedCameraRef.current = true;
      const minZoom = getMinZoom();
      const cam = cameraRef.current;
      const vp = viewportRef.current;

      const cursorScreenX = e.clientX;
      const cursorScreenY = e.clientY;

      const worldX = (cursorScreenX - vp.width / 2) / cam.zoom + cam.x;
      const worldY = (cursorScreenY - vp.height / 2) / cam.zoom + cam.y;

      const zoomFactor = Math.exp(-e.deltaY * 0.002);
      const newZoom = Math.max(minZoom, Math.min(MAX_ZOOM, cam.zoom * zoomFactor));

      cam.x = clampCameraPosition(
        worldX - (cursorScreenX - vp.width / 2) / newZoom,
        worldY - (cursorScreenY - vp.height / 2) / newZoom
      ).x;
      cam.y = clampCameraPosition(
        cam.x,
        worldY - (cursorScreenY - vp.height / 2) / newZoom
      ).y;
      cam.zoom = newZoom;

      setZoomDisplay(Math.round(newZoom * 100));
      renderCanvas();
    },
    [clampCameraPosition, getMinZoom, renderCanvas]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Extrai domínio formatado de uma URL de anúncio
  const formatDomain = (urlStr?: string): string => {
    if (!urlStr) return '';
    try {
      const u = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return urlStr;
    }
  };

  // Dados reais de estatísticas
  const soldPixels = stats?.soldPixels ?? 0;
  const totalPixels = stats?.totalPixels || 1000000;
  const availablePixels = stats?.availablePixels ?? Math.max(0, totalPixels - soldPixels);

  const soldPixelsFormatted = useMemo(() => {
    return soldPixels.toLocaleString('pt-BR');
  }, [soldPixels]);

  const availablePixelsFormatted = useMemo(() => {
    return availablePixels.toLocaleString('pt-BR');
  }, [availablePixels]);

  const soldPercentage = useMemo(() => {
    if (soldPixels === 0) return '0%';
    const pct = (soldPixels / totalPixels) * 100;
    if (pct < 0.01) return '<0.01%';
    if (pct < 1) return `${pct.toFixed(2)}%`;
    return `${pct.toFixed(1)}%`;
  }, [soldPixels, totalPixels]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-stone-100">
      {/* Elemento Canvas Principal */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      {/* HEADER FLUTUANTE COM DADOS REAIS, PRESENÇA AO VIVO E CONVERSÃO */}
      <header className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-6 pointer-events-none z-20 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {/* Esquerda: Identidade Manda Pixel + Pílula de Presença ao Vivo */}
          <div className="pointer-events-auto min-w-0 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-stone-300 shadow-sm px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-2xl">
            <img src="/logo.svg" alt="Manda Pixel Logo" className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate font-pixel text-stone-950 text-sm sm:text-base leading-none">
                Manda Pixel
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-stone-950 leading-none whitespace-nowrap shrink-0">
                R$ 1/px
              </span>
            </div>

            <div className="hidden sm:block w-[1px] h-3.5 bg-stone-300 mx-0.5" />

            {/* Pílula de presença ao vivo */}
            <div
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] font-semibold whitespace-nowrap shrink-0"
              title={`${onlineCount} pessoas conectadas agora`}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span className="font-bold text-emerald-950">{onlineCount}</span>
              <span className="text-emerald-900 hidden sm:inline">explorando agora</span>
              <span className="sr-only sm:hidden">online</span>
            </div>
          </div>

          {/* Direita: Links e Botão Principal "Comprar pixels" */}
          <div className="pointer-events-auto shrink-0 flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-stone-300 shadow-sm p-1.5 rounded-2xl">
            <a
              href="/diario"
              className="hidden md:inline-flex px-2.5 py-1 text-xs font-bold text-stone-800 hover:text-purple-950 rounded-xl hover:bg-stone-100 transition"
            >
              Diário
            </a>
            <a
              href="/time"
              className="hidden md:inline-flex px-2.5 py-1 text-xs font-bold text-stone-800 hover:text-purple-950 rounded-xl hover:bg-stone-100 transition"
            >
              Time
            </a>
            <a
              href="/painel"
              className="hidden md:inline-flex px-2.5 py-1 text-xs font-bold text-stone-800 hover:text-purple-950 rounded-xl hover:bg-stone-100 transition"
            >
              Painel
            </a>
            <button
              onClick={handleCtaBuyPixels}
              className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold transition shadow-sm text-xs active:scale-95 whitespace-nowrap shrink-0"
            >
              <svg className="w-3.5 h-3.5 text-amber-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Comprar pixels</span>
              <span className="hidden sm:inline text-amber-300 font-semibold">• R$ 1/px</span>
            </button>
          </div>
        </div>

        {/* Linha de Prova Social & Progresso Real Rumo a 1 Milhão */}
        <div className="flex items-center gap-2 self-start flex-wrap">
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-stone-300 shadow-sm px-3 py-1.5 rounded-xl flex flex-col gap-1 text-[11px] min-w-[210px] sm:min-w-[270px]">
            <div className="flex items-center justify-between gap-3 text-stone-800 font-semibold leading-tight">
              <span>
                <strong className="text-stone-950 font-bold tabular-nums">{soldPixelsFormatted}</strong> / 1.000.000 vendidos ({soldPercentage})
              </span>
              <span className="text-emerald-700 font-bold tabular-nums">
                {availablePixelsFormatted} livres
              </span>
            </div>
            {/* Barra de progresso visual rumo a 1 milhão */}
            <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden" title={`${soldPixelsFormatted} de 1.000.000 pixels vendidos`}>
              <div
                className="bg-purple-800 h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(soldPixels > 0 ? 0.8 : 0, (soldPixels / totalPixels) * 100))}%`,
                }}
              />
            </div>
            <ExperimentDay />
          </div>

          {/* Legenda compacta dos 4 estados */}
          <div className="pointer-events-none hidden lg:flex items-center gap-2.5 bg-white/95 backdrop-blur-sm border border-stone-300 shadow-sm px-3 py-1.5 rounded-xl text-[11px] text-stone-800 font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-white border border-stone-400" />
              <span>Livre</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>Publicado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 border border-amber-600" />
              <span>Em análise</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 border border-purple-600 border-dashed" />
              <span>Reservado</span>
            </div>
          </div>

          {/* Pílula de Código Aberto & Links institucionais */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-stone-300 shadow-sm px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-stone-800">
            <a
              href="https://github.com/codecon-dev/manda-pixel"
              target="_blank"
              rel="noopener noreferrer"
              title="Ver código aberto no GitHub"
              className="inline-flex items-center gap-1.5 hover:text-purple-950 transition"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>Código aberto</span>
            </a>
            <span className="text-stone-600">•</span>
            <a href="/termos" className="hover:text-purple-950 transition">
              Termos
            </a>
            <span className="text-stone-600">•</span>
            <a href="/privacidade" className="hover:text-purple-950 transition">
              Privacidade
            </a>
            <span className="text-stone-600 md:hidden">•</span>
            <a href="/diario" className="md:hidden hover:text-purple-950 transition">
              Diário
            </a>
            <span className="text-stone-600 md:hidden">•</span>
            <a href="/time" className="md:hidden hover:text-purple-950 transition">
              Time
            </a>
            <span className="text-stone-600 md:hidden">•</span>
            <a href="/painel" className="md:hidden hover:text-purple-950 transition">
              Painel
            </a>
          </div>
        </div>

        {/* BOAS-VINDAS NO DESKTOP: NO FLUXO DO HEADER, SEMPRE ABAIXO DAS BARRAS */}
        {showWelcome && (
          <div className="hidden sm:block mt-1 pointer-events-auto self-start w-full max-w-md animate-in fade-in slide-in-from-top-3 duration-200">
            <WelcomeCard onDismiss={dismissWelcome} onChooseSpace={chooseSpaceFromWelcome} />
          </div>
        )}
      </header>

      {/* TOOLTIP DE HOVER (MOUSE) OU CARD FIXO ABERTO POR TOQUE */}
      {touchCard ? (
        <AdTooltip
          {...touchCard}
          domain={formatDomain(touchCard.block.linkUrl)}
          pinned
          onClose={() => setTouchCard(null)}
        />
      ) : (
        hoveredBlock && (
          <AdTooltip {...hoveredBlock} domain={formatDomain(hoveredBlock.block.linkUrl)} />
        )
      )}

      {/* FEEDBACK DE SNAP FLUTUANTE QUANDO SOBRE CÉLULA LIVRE */}
      {!hoveredBlock && hoveredFreeCell && (
        <div
          className="pointer-events-none fixed z-30 -translate-x-1/2 -translate-y-full mb-3 px-2 py-1 bg-stone-900/90 text-white text-[11px] font-medium rounded-lg shadow-md border border-stone-700 animate-in fade-in"
          style={{
            left: `${hoveredFreeCell.screenX}px`,
            top: `${hoveredFreeCell.screenY - 6}px`,
          }}
        >
          <div className="flex items-center gap-1 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Disponível • 5×5 px mín. (R$ 25)</span>
          </div>
        </div>
      )}

      {/* NOTIFICAÇÃO FLUTUANTE (AVISO DE BLOCO RESERVADO OU EM ANÁLISE) */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-sm w-[calc(100%-2rem)] px-3.5 py-2.5 rounded-2xl bg-stone-950/95 backdrop-blur-md text-white border border-stone-700 shadow-2xl flex items-center gap-2.5 text-xs animate-in fade-in zoom-in-95">
          <span className="text-base shrink-0">
            {notification.type === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          <span className="font-semibold text-stone-200 flex-1">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-white font-bold p-1 leading-none"
            aria-label="Fechar notificação"
          >
            ✕
          </button>
        </div>
      )}

      {/* AVISO DE RETORNO DO CHECKOUT (CANCELADO OU EXPIRADO) */}
      {returnBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-md w-[calc(100%-2rem)] px-4 py-3 rounded-2xl bg-stone-900/95 backdrop-blur-md text-white border border-stone-700 shadow-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-amber-400">
              {returnBanner.type === 'cancelado' ? 'Pagamento cancelado' : 'Reserva expirada'}
            </span>
            <span className="text-stone-300 text-[11px] leading-snug">{returnBanner.message}</span>
          </div>
          <button
            onClick={() => setReturnBanner(null)}
            className="text-stone-400 hover:text-white font-bold p-1.5 rounded-lg shrink-0"
            aria-label="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {/* BARRA INFERIOR / HUD & CONTROLES */}
      <div className="absolute bottom-3 inset-x-3 sm:bottom-6 sm:inset-x-6 pb-[env(safe-area-inset-bottom)] pointer-events-none z-20 flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 sm:gap-2.5">
        {/* BOAS-VINDAS NO MOBILE: NO FLUXO DA BARRA INFERIOR, LOGO ACIMA DELA, CENTRO LIVRE */}
        {showWelcome && (
          <div className="sm:hidden pointer-events-auto max-h-[40dvh] overflow-y-auto animate-in fade-in slide-in-from-bottom-3 duration-200">
            <WelcomeCard compact onDismiss={dismissWelcome} onChooseSpace={chooseSpaceFromWelcome} />
          </div>
        )}
        {selectedArea ? (
          /* PAINEL FLUTUANTE DA SELEÇÃO ATIVA */
          <div className="pointer-events-auto bg-white/98 backdrop-blur-md border-2 border-purple-900/25 shadow-2xl rounded-2xl p-3 sm:p-3.5 max-w-xl w-full flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Linha Superior: Coordenadas, Dimensões, Preço e Fechar */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-100 text-purple-950 font-mono font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-purple-700 shrink-0" />
                  X: {selectedArea.x}, Y: {selectedArea.y}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-stone-100 text-stone-900 font-bold text-xs">
                  {selectedArea.w}×{selectedArea.h} px ({selectedArea.w * selectedArea.h} px)
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-100 text-amber-950 font-extrabold text-xs">
                  R$ {(selectedArea.w * selectedArea.h).toLocaleString('pt-BR')},00
                </span>
              </div>
              <button
                onClick={() => setSelectedArea(null)}
                className="text-stone-600 hover:text-stone-900 p-1 rounded-lg hover:bg-stone-100 transition font-bold text-sm leading-none shrink-0"
                title="Cancelar seleção"
                aria-label="Cancelar seleção"
              >
                ✕
              </button>
            </div>

            {/* Linha Intermediária: Presets rápidos e Steppers */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200">
              {/* Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider mr-0.5 whitespace-nowrap">Tamanhos:</span>
                {PRESETS.map((p) => {
                  const isActive = selectedArea.w === p.w && selectedArea.h === p.h;
                  return (
                    <button
                      key={p.label}
                      onClick={() => applyPreset(p.w, p.h)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                        isActive
                          ? 'bg-purple-900 text-white shadow-sm'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                      }`}
                      title={`${p.label} pixels = R$ ${p.price}`}
                    >
                      {p.label} <span className={isActive ? 'text-amber-300' : 'text-stone-600'}>• R$ {p.price}</span>
                    </button>
                  );
                })}
              </div>

              {/* Steppers de Largura (W) e Altura (H) em passos de 5 */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
                  <span className="text-[10px] font-bold text-stone-600 px-1">L:</span>
                  <button
                    onClick={() => adjustDimension('w', -5)}
                    disabled={selectedArea.w <= 5}
                    className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-stone-200 text-stone-800 font-bold text-xs disabled:opacity-40"
                    title="Diminuir largura em 5px"
                  >
                    −
                  </button>
                  <span className="text-xs font-mono font-bold text-stone-900 min-w-[28px] text-center">
                    {selectedArea.w}
                  </span>
                  <button
                    onClick={() => adjustDimension('w', 5)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-stone-200 text-stone-800 font-bold text-xs"
                    title="Aumentar largura em 5px"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
                  <span className="text-[10px] font-bold text-stone-600 px-1">A:</span>
                  <button
                    onClick={() => adjustDimension('h', -5)}
                    disabled={selectedArea.h <= 5}
                    className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-stone-200 text-stone-800 font-bold text-xs disabled:opacity-40"
                    title="Diminuir altura em 5px"
                  >
                    −
                  </button>
                  <span className="text-xs font-mono font-bold text-stone-900 min-w-[28px] text-center">
                    {selectedArea.h}
                  </span>
                  <button
                    onClick={() => adjustDimension('h', 5)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-stone-200 text-stone-800 font-bold text-xs"
                    title="Aumentar altura em 5px"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Aviso visual de colisão ou limite */}
            {collisionWarning && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold animate-in fade-in">
                <span className="shrink-0 text-amber-600 font-bold">⚠️</span>
                <span className="truncate">{collisionWarning}</span>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={() => setSelectedArea(null)}
                className="px-3 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleOpenBuyPanel}
                className="flex-1 py-2 px-3 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold transition shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <span>Continuar com este espaço</span>
                <span className="text-amber-300 font-extrabold">
                  • R$ {(selectedArea.w * selectedArea.h).toLocaleString('pt-BR')},00
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* HUD QUANDO NÃO HÁ SELEÇÃO ATIVA */
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-stone-300 shadow-md rounded-2xl p-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 tabular-nums">
            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0 min-w-0 text-xs">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-stone-400 shrink-0" />
                <span className="font-extrabold text-stone-950 whitespace-nowrap shrink-0">
                  {cursorCoord.inside ? `Posição X: ${cursorCoord.x}, Y: ${cursorCoord.y}` : 'Fora da Grade'}
                </span>
                <span className="text-[11px] sm:text-xs text-stone-700 font-semibold whitespace-nowrap shrink-0">5×5 px mín.</span>
              </div>
              <span className="text-xs text-stone-700 mt-0.5">
                Toque na grade ou clique em <strong>Comprar pixels</strong>
              </span>
            </div>

            <button
              onClick={handleCtaBuyPixels}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold shadow transition active:scale-95 flex items-center gap-1.5"
            >
              <span>Comprar pixels</span>
              <span className="text-amber-300 font-extrabold">• R$ 1/px</span>
            </button>
          </div>
        )}

        {/* CONTROLES DE ZOOM E BOTÃO VOLTAR AO CENTRO */}
        <div className="pointer-events-auto self-end sm:self-auto bg-white/95 backdrop-blur-md border border-stone-300 shadow-md rounded-2xl p-1.5 flex items-center gap-1.5 shrink-0">
          {/* Botão Voltar ao Centro */}
          <button
            onClick={handleResetCenter}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-950 text-xs font-bold transition active:scale-95 shrink-0"
            title="Voltar ao centro (500, 500)"
            aria-label="Voltar ao centro"
          >
            <svg className="w-4 h-4 text-purple-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="7" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
            <span className="text-xs font-bold text-stone-950">Centro</span>
          </button>

          <div className="w-[1px] h-4 bg-stone-300 mx-0.5 shrink-0" />

          {/* Botão Menos Zoom */}
          <button
            onClick={() => handleZoomChange(1 / 1.35)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-950 text-base font-extrabold transition active:scale-95 shrink-0"
            title="Diminuir zoom"
            aria-label="Diminuir zoom"
          >
            −
          </button>

          {/* Indicador de Nível de Zoom */}
          <span className="text-xs font-mono font-bold text-stone-950 px-1 min-w-[44px] text-center select-none shrink-0">
            {zoomDisplay}%
          </span>

          {/* Botão Mais Zoom */}
          <button
            onClick={() => handleZoomChange(1.35)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-950 text-base font-extrabold transition active:scale-95 shrink-0"
            title="Aumentar zoom"
            aria-label="Aumentar zoom"
          >
            +
          </button>
        </div>
      </div>

      {/* PAINEL LATERAL / GAVETA DE COMPRA COM UPLOAD E VALIDACAO */}
      {selectedArea && (
        <BuyPanel
          isOpen={buyPanelOpen}
          onClose={() => setBuyPanelOpen(false)}
          selection={selectedArea}
          onResizeStep={handleResizeStep}
          onPreviewChange={setPreviewDataUrl}
          onSubmit={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
