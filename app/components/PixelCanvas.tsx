'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const GRID_SIZE = 1000;
const BLOCK_SIZE = 5; // Bloco mínimo de 5x5 pixels (R$ 1/pixel = R$ 25)
const MAX_ZOOM = 24;

export default function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Câmera no espaço do mundo (coordenada central 500, 500)
  const cameraRef = useRef<Camera>({ x: 500, y: 500, zoom: 1.2 });
  const [zoomDisplay, setZoomDisplay] = useState<number>(120);

  // Coordenada do cursor / centro no mundo (alinhada em múltiplos de 5)
  const [cursorCoord, setCursorCoord] = useState<{ x: number; y: number; inside: boolean }>({
    x: 500,
    y: 500,
    inside: true,
  });

  // Bloco selecionado pelo usuário (inicia no centro 500, 500)
  const [selectedBlock, setSelectedBlock] = useState<{ x: number; y: number } | null>({
    x: 500,
    y: 500,
  });

  // Modal/Feedback de compra ao clicar no botão
  const [purchaseModalOpen, setPurchaseModalOpen] = useState<boolean>(false);

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

    // Bounding box visível no mundo para culling de linhas
    const wLeft = Math.max(0, screenToWorld(0, 0, cam).x);
    const wRight = Math.min(GRID_SIZE, screenToWorld(vp.width, 0, cam).x);
    const wTop = Math.max(0, screenToWorld(0, 0, cam).y);
    const wBottom = Math.min(GRID_SIZE, screenToWorld(0, vp.height, cam).y);

    if (wLeft < wRight && wTop < wBottom) {
      // 1. Linhas finas de 5 em 5 pixels (blocos mínimos de R$ 25)
      // Visíveis quando o zoom permite enxergar sem poluir a tela
      if (cam.zoom >= 1.2) {
        const opacity = Math.min(0.2, (cam.zoom - 1.2) * 0.1);
        ctx.strokeStyle = `rgba(100, 116, 139, ${opacity.toFixed(3)})`;
        ctx.lineWidth = 1;

        ctx.beginPath();
        const start5X = Math.floor(wLeft / 5) * 5;
        const end5X = Math.ceil(wRight / 5) * 5;
        for (let wx = start5X; wx <= end5X; wx += 5) {
          if (wx % 50 === 0) continue; // Pula múltiplos de 50
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

      // 2. Linhas de referência a cada 50 pixels
      if (cam.zoom >= 0.4) {
        ctx.strokeStyle = 'rgba(106, 51, 120, 0.2)';
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

      // 3. Linhas principais a cada 100 pixels
      ctx.strokeStyle = 'rgba(106, 51, 120, 0.4)';
      ctx.lineWidth = 1.2;

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

    // 4. Eixos centrais em 500, 500
    const centerScreen = worldToScreen(500, 500, cam);
    ctx.strokeStyle = 'rgba(106, 51, 120, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(centerScreen.x, Math.max(screenOrigin.y, 0));
    ctx.lineTo(centerScreen.x, Math.min(screenOrigin.y + gridHeightPx, vp.height));
    ctx.moveTo(Math.max(screenOrigin.x, 0), centerScreen.y);
    ctx.lineTo(Math.min(screenOrigin.x + gridWidthPx, vp.width), centerScreen.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Destaque elegante do ponto central (500, 500)
    ctx.beginPath();
    ctx.arc(centerScreen.x, centerScreen.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#FCD953';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#6A3378';
    ctx.stroke();

    // 6. Bloco Selecionado
    if (selectedBlock) {
      const bScreen = worldToScreen(selectedBlock.x, selectedBlock.y, cam);
      const bSize = BLOCK_SIZE * cam.zoom;
      ctx.fillStyle = 'rgba(106, 51, 120, 0.25)';
      ctx.fillRect(bScreen.x, bScreen.y, bSize, bSize);
      ctx.strokeStyle = '#6A3378';
      ctx.lineWidth = Math.max(2, cam.zoom * 0.3);
      ctx.strokeRect(bScreen.x, bScreen.y, bSize, bSize);

      // Marcador de canto no bloco selecionado
      const markerSize = Math.min(6, bSize * 0.4);
      ctx.fillStyle = '#FCD953';
      ctx.fillRect(bScreen.x, bScreen.y, markerSize, markerSize);
    }

    // 7. Borda externa clara e robusta delimitando os 1000 x 1000 pixels
    ctx.strokeStyle = '#6A3378';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(screenOrigin.x, screenOrigin.y, gridWidthPx, gridHeightPx);

    // Cantos destacados da grade de 1000x1000
    const cornerLen = 14;
    ctx.strokeStyle = '#FCD953';
    ctx.lineWidth = 3.5;
    const corners = [
      [screenOrigin.x, screenOrigin.y],
      [screenOrigin.x + gridWidthPx, screenOrigin.y],
      [screenOrigin.x, screenOrigin.y + gridHeightPx],
      [screenOrigin.x + gridWidthPx, screenOrigin.y + gridHeightPx],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [screenToWorld, worldToScreen, selectedBlock]);

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

    renderCanvas();
  }, [renderCanvas]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Inicializa a visão centralizada em (500, 500)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      const initialZoom = w < 640 ? 0.95 : 1.2;
      cameraRef.current = { x: 500, y: 500, zoom: initialZoom };
      setZoomDisplay(Math.round(initialZoom * 100));
      renderCanvas();
    }
  }, [renderCanvas]);

  // Transição suave para um ponto e zoom
  const smoothAnimateTo = useCallback(
    (targetX: number, targetY: number, targetZoom: number, duration = 400) => {
      isTransitioningRef.current = true;
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
      isDraggingRef.current = true;
      dragStartScreenRef.current = { x: e.clientX, y: e.clientY };
      dragStartCamRef.current = { x: cameraRef.current.x, y: cameraRef.current.y };
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      lastPointerTimeRef.current = performance.now();
      velocityRef.current = { vx: 0, vy: 0 };
    } else if (activePointersRef.current.size === 2) {
      // Inicia Pinch
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

    // Atualiza coordenada do cursor no HUD
    const worldPoint = screenToWorld(e.clientX, e.clientY);
    const alignedX = Math.floor(worldPoint.x / BLOCK_SIZE) * BLOCK_SIZE;
    const alignedY = Math.floor(worldPoint.y / BLOCK_SIZE) * BLOCK_SIZE;
    const inside = alignedX >= 0 && alignedX < GRID_SIZE && alignedY >= 0 && alignedY < GRID_SIZE;
    setCursorCoord({ x: alignedX, y: alignedY, inside });

    // Drag com 1 ponteiro
    if (isDraggingRef.current && active.size === 1) {
      const now = performance.now();
      const dt = Math.max(now - lastPointerTimeRef.current, 1);

      const dxScreen = e.clientX - lastPointerPosRef.current.x;
      const dyScreen = e.clientY - lastPointerPosRef.current.y;
      pointerDistanceTraveledRef.current += Math.hypot(dxScreen, dyScreen);

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

    // Se foi apenas um clique (sem arraste relevante), seleciona o bloco
    if (pointerDistanceTraveledRef.current < 6) {
      const worldPoint = screenToWorld(e.clientX, e.clientY);
      const blockX = Math.floor(worldPoint.x / BLOCK_SIZE) * BLOCK_SIZE;
      const blockY = Math.floor(worldPoint.y / BLOCK_SIZE) * BLOCK_SIZE;
      if (blockX >= 0 && blockX < GRID_SIZE && blockY >= 0 && blockY < GRID_SIZE) {
        setSelectedBlock({ x: blockX, y: blockY });
        renderCanvas();
      }
    }

    if (activePointersRef.current.size === 0) {
      isDraggingRef.current = false;
    }
  };

  // Zoom pelo mouse wheel focado no cursor
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
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

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-stone-100">
      {/* Elemento Canvas */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      {/* HEADER FLUTUANTE DISCRETO */}
      <header className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-6 pointer-events-none z-20 flex items-center justify-between gap-2">
        {/* Identidade do Manda Pixel */}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-white border border-stone-300 shadow-md px-3.5 py-2 rounded-2xl">
          <img src="/logo.svg" alt="Manda Pixel Logo" className="w-6 h-6 shrink-0" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-stone-950 tracking-tight text-sm leading-none">Manda Pixel</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-stone-950 leading-none">
                R$ 1/px
              </span>
            </div>
            <span className="text-xs text-stone-700 font-semibold hidden md:inline leading-tight mt-0.5">
              1.000.000 pixels • Blocos de 5×5
            </span>
          </div>
        </div>

        {/* Links de navegação e Chamada */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-white border border-stone-300 shadow-md px-2 py-1.5 rounded-2xl text-xs font-bold text-stone-950">
          <a
            href="/diario"
            className="px-2.5 py-1 rounded-xl hover:bg-stone-100 hover:text-purple-950 transition"
          >
            Diário
          </a>
          <a
            href="/time"
            className="px-2.5 py-1 rounded-xl hover:bg-stone-100 hover:text-purple-950 transition"
          >
            Time
          </a>
          <button
            onClick={() => setPurchaseModalOpen(true)}
            className="hidden sm:inline-flex items-center px-3 py-1 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold transition shadow-sm text-xs"
          >
            Garantir Bloco
          </button>
        </div>
      </header>

      {/* BARRA INFERIOR / HUD & CONTROLES */}
      <div className="absolute bottom-3 inset-x-3 sm:bottom-6 sm:inset-x-6 pointer-events-none z-20 flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-2.5">
        {/* HUD DO BLOCO SELECIONADO & COORDENADAS COM CHAMADA PRINCIPAL DE COMPRA */}
        <div className="pointer-events-auto bg-white border border-stone-300 shadow-md rounded-2xl p-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-800 shrink-0" />
              <span className="font-extrabold text-stone-950 truncate">
                {selectedBlock
                  ? `Bloco (${selectedBlock.x}, ${selectedBlock.y})`
                  : cursorCoord.inside
                  ? `X: ${cursorCoord.x}, Y: ${cursorCoord.y}`
                  : 'Fora da Grade'}
              </span>
              <span className="text-xs text-stone-700 font-semibold">5×5 px</span>
            </div>
            <span className="text-xs text-stone-800 font-mono mt-0.5">
              Valor: <strong className="text-purple-950 font-bold">R$ 25,00</strong> (R$ 1/pixel)
            </span>
          </div>

          <button
            onClick={() => setPurchaseModalOpen(true)}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold shadow transition active:scale-95 flex items-center gap-1.5"
          >
            <span>Comprar Bloco</span>
            <span className="text-amber-300 font-extrabold">• R$ 25</span>
          </button>
        </div>

        {/* CONTROLES DE ZOOM E BOTÃO VOLTAR AO CENTRO */}
        <div className="pointer-events-auto self-end sm:self-auto bg-white border border-stone-300 shadow-md rounded-2xl p-1.5 flex items-center gap-1.5">
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

      {/* MODAL / DRAWER DE COMPRA DO BLOCO SELECIONADO */}
      {purchaseModalOpen && (
        <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="Manda Pixel Logo" className="w-6 h-6" />
                <h3 className="font-bold text-stone-900 text-base">Garantir Bloco de Pixels</h3>
              </div>
              <button
                onClick={() => setPurchaseModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 text-xs space-y-2">
              <div className="flex justify-between text-stone-600">
                <span>Coordenadas:</span>
                <strong className="font-mono text-stone-900">
                  X: {selectedBlock?.x ?? 500}, Y: {selectedBlock?.y ?? 500}
                </strong>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Tamanho do bloco:</span>
                <strong className="text-stone-900">5×5 pixels (25 pixels)</strong>
              </div>
              <div className="flex justify-between text-stone-600 border-t border-stone-200 pt-2 font-bold">
                <span>Total a pagar:</span>
                <span className="text-purple-900 text-sm">R$ 25,00 via Pix</span>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              Cada pixel custa R$ 1,00. O fluxo completo de compra e personalização do bloco com link e imagem será ativado nas próximas etapas.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setPurchaseModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition"
              >
                Continuar Navegando
              </button>
              <button
                onClick={() => setPurchaseModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold transition shadow"
              >
                Confirmar Bloco
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}