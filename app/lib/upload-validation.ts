import { MAX_UPLOAD_BYTES } from './constants.ts';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

/** Devolve a mensagem de erro para o visitante, ou null se o PNG do anúncio é aceitável. */
export function validateAdPng(buffer: Buffer): string | null {
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return 'A imagem do anúncio passou de 5 MB. Use uma imagem mais leve e tente de novo.';
  }
  const isPng =
    buffer.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((byte, i) => buffer[i] === byte);
  if (!isPng) {
    return 'A imagem do anúncio não é um PNG válido. Refaça o recorte e tente de novo.';
  }
  return null;
}
