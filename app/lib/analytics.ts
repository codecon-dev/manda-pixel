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

export type CheckoutRetornoResultado = 'sucesso' | 'cancelado' | 'expirado';

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

export function trackAnuncioPublicado(props: AnuncioPublicadoProps): void {
  captureSafe('anuncio_publicado', {
    orderId: props.orderId,
    pixels: props.pixels,
  });
}
