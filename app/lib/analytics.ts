'use client';

// PostHog Analytics Client Helper

declare global {
  interface Window {
    posthog?: {
      capture: (eventName: string, properties?: Record<string, unknown>) => void;
    };
  }
}

export interface BlocoSelecionadoProps {
  pixels: number;
  x: number;
  y: number;
}

export interface CheckoutIniciadoProps {
  orderId: string;
  pixels: number;
  value: number;
}

/** Status do pedido lido no retorno do checkout. */
export type CheckoutRetornoResultado = 'sucesso' | 'pendente' | 'expirado' | 'estornado';

export interface CheckoutRetornoProps {
  orderId: string;
  resultado: CheckoutRetornoResultado;
}

export interface AnuncioPublicadoProps {
  orderId: string;
  pixels: number;
}

function captureSafe(eventName: string, properties: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(eventName, properties);
    }
  } catch {
    // Analytics nunca deve quebrar o fluxo da aplicação
  }
}

export function trackBlocoSelecionado(props: BlocoSelecionadoProps): void {
  captureSafe('bloco_selecionado', {
    pixels: props.pixels,
    x: props.x,
    y: props.y,
  });
}

export function trackCheckoutIniciado(props: CheckoutIniciadoProps): void {
  captureSafe('checkout_iniciado', {
    orderId: props.orderId,
    pixels: props.pixels,
    value: props.value,
  });
}

export function trackCheckoutRetorno(props: CheckoutRetornoProps): void {
  captureSafe('checkout_retorno', {
    orderId: props.orderId,
    resultado: props.resultado,
  });
}

export function trackSharePosicao(props: { x: number; y: number }): void {
  captureSafe('share_click', { tipo: 'posicao', x: props.x, y: props.y });
}

/** Pagina /previa: so acao, posicao e lado do quadrado (nada da imagem). */
export function trackPreviewLogo(
  acao: 'upload' | 'download' | 'share' | 'comprar',
  props: { x: number; y: number; tamanho: number },
): void {
  captureSafe('preview_logo', { acao, x: props.x, y: props.y, tamanho: props.tamanho });
}

export function trackAnuncioPublicado(props: AnuncioPublicadoProps): void {
  captureSafe('anuncio_publicado', {
    orderId: props.orderId,
    pixels: props.pixels,
  });
}
