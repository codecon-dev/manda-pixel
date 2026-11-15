/** Dados publicos de um anuncio no ar. Nunca inclui dado pessoal do comprador. */
export type PublicAd = {
  orderId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  pixels: number;
  imagePath: string | null;
  linkUrl: string | null;
  altText: string | null;
  xHandle: string | null;
  paidAt: string | null;
  /** Ordem do anuncio entre os que estao no ar (1 = primeiro pago). */
  number: number;
  /** Cliques vindos do site (rota /r/[id]). */
  clicks: number;
};

/** Resultado da rota /r/[id]: 404 ou redirect para o link gravado do anuncio. */
export type AdRedirectResult = { status: 404 } | { status: 302; location: string };

/** Ponto da grade para abrir a home focada (?x=&y=). */
export type GridFocus = {
  x: number;
  y: number;
};

/** Retângulo de um anúncio na grade, em pixels do mundo. */
export interface AdRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Posição e zoom da câmera da grade. */
export interface CameraView {
  x: number;
  y: number;
  zoom: number;
}
