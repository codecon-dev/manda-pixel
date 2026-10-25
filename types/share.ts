/** Quem compartilha: o dono do anúncio (/obrigado) ou um visitante (/a/[id]). */
export type ShareVariant = 'comprador' | 'visitante';

export type ShareUrlInput = {
  adId: string;
  pixels: number;
  variant: ShareVariant;
};
