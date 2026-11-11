import { MAX_INPUT_PIXELS, MAX_UPLOAD_BYTES } from './constants.ts';

export type AdImageErrorCode = 'unavailable' | 'invalid' | 'wrong-size';

/** Falha ao validar/reencodar a imagem do anúncio; message é texto para o visitante. */
export class AdImageError extends Error {
  readonly code: AdImageErrorCode;
  constructor(code: AdImageErrorCode, message: string) {
    super(message);
    this.name = 'AdImageError';
    this.code = code;
  }
}

type SharpFactory = typeof import('sharp').default;

async function loadSharp(): Promise<SharpFactory> {
  try {
    // Import nativo em runtime: o build não depende do sharp instalado, o Node resolve no servidor
    const mod = await import(/* webpackIgnore: true */ 'sharp');
    return mod.default;
  } catch (err) {
    console.error('[upload-validation] sharp indisponível', err instanceof Error ? err.message : err);
    throw new AdImageError('unavailable', 'Não deu para processar a imagem agora. Tente de novo em instantes.');
  }
}

/**
 * Decodifica o PNG com sharp, confere o tamanho esperado do recorte (bloco x cropScale)
 * e devolve só os bytes reencodados. Lança AdImageError se algo não bater.
 */
export async function reencodeAdPng(
  buf: Buffer,
  expectedWidth: number,
  expectedHeight: number,
): Promise<Buffer> {
  const sharp = await loadSharp();
  const invalid = 'A imagem do anúncio não é um PNG válido. Refaça o recorte e tente de novo.';
  try {
    const image = sharp(buf, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' });
    const meta = await image.metadata();
    if (meta.format !== 'png') throw new AdImageError('invalid', invalid);
    if (meta.width !== expectedWidth || meta.height !== expectedHeight) {
      throw new AdImageError('wrong-size', 'A imagem não tem o tamanho do bloco escolhido. Refaça o recorte e tente de novo.');
    }
    return await image.png().toBuffer();
  } catch (err) {
    if (err instanceof AdImageError) throw err;
    throw new AdImageError('invalid', invalid);
  }
}

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
