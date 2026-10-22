import zlib from 'node:zlib';

/**
 * Ampliacao "pixelada" (vizinho mais proximo) de PNG em JS puro, para o card Open Graph:
 * o renderizador do next/og suaviza imagem pequena e nao ha sharp no projeto.
 * Suporta PNG 8 bits RGB/RGBA sem entrelacamento (o que o recorte do site gera).
 */

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const COLOR_RGB = 2;
const COLOR_RGBA = 6;

export class UnsupportedPngError extends Error {}

type Decoded = { width: number; height: number; rgba: Buffer };

function crc32(buf: Buffer): number {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ -1) >>> 0;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function unfilter(data: Buffer, width: number, height: number, bpp: number): Buffer {
  const stride = width * bpp;
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = data[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    for (let i = 0; i < stride; i++) {
      const left = i >= bpp ? out[y * stride + i - bpp] : 0;
      const up = y > 0 ? out[(y - 1) * stride + i] : 0;
      const upLeft = y > 0 && i >= bpp ? out[(y - 1) * stride + i - bpp] : 0;
      const predictor = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][filter];
      if (predictor === undefined) throw new UnsupportedPngError(`filtro PNG invalido: ${filter}`);
      out[y * stride + i] = (data[src + i] + predictor) & 0xff;
    }
  }
  return out;
}

export function decodePng(file: Buffer): Decoded {
  if (file.length < 8 || !file.subarray(0, 8).equals(PNG_SIGNATURE)) throw new UnsupportedPngError('nao e PNG');
  let offset = 8;
  let width = 0, height = 0, colorType = -1;
  const idat: Buffer[] = [];
  while (offset + 8 <= file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString('ascii', offset + 4, offset + 8);
    const data = file.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      if (data[8] !== 8 || data[12] !== 0 || (colorType !== COLOR_RGB && colorType !== COLOR_RGBA)) {
        throw new UnsupportedPngError('formato PNG nao suportado');
      }
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  if (!width || !height || idat.length === 0) throw new UnsupportedPngError('PNG incompleto');
  const bpp = colorType === COLOR_RGBA ? 4 : 3;
  const pixels = unfilter(zlib.inflateSync(Buffer.concat(idat)), width, height, bpp);
  if (bpp === 4) return { width, height, rgba: pixels };
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < pixels.length; i += 3, j += 4) {
    rgba[j] = pixels[i]; rgba[j + 1] = pixels[i + 1]; rgba[j + 2] = pixels[i + 2]; rgba[j + 3] = 255;
  }
  return { width, height, rgba };
}

export function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

export function encodePng({ width, height, rgba }: Decoded): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = COLOR_RGBA;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([PNG_SIGNATURE, pngChunk('IHDR', header), pngChunk('IDAT', zlib.deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))]);
}

const IHDR_WIDTH_OFFSET = 16;
const IHDR_HEIGHT_OFFSET = 20;
const IHDR_MIN_BYTES = 24;

/** Tamanho real do PNG lido do IHDR, sem decodificar. Lanca UnsupportedPngError se nao for PNG. */
export function pngSize(buf: Buffer): { width: number; height: number } {
  if (buf.length < IHDR_MIN_BYTES || !buf.subarray(0, 8).equals(PNG_SIGNATURE) || buf.toString('ascii', 12, 16) !== 'IHDR') {
    throw new UnsupportedPngError('nao e PNG (assinatura ou IHDR ausente)');
  }
  return { width: buf.readUInt32BE(IHDR_WIDTH_OFFSET), height: buf.readUInt32BE(IHDR_HEIGHT_OFFSET) };
}

/** Maior fator inteiro (minimo 1) para o maior lado caber em max. */
export function integerScale(width: number, height: number, max: number): number {
  return Math.max(1, Math.floor(max / Math.max(width, height, 1)));
}

/** Amplia por fator inteiro ate caber em maxSide. Fator < 2: devolve o arquivo original. */
export function upscalePngNearest(file: Buffer, maxSide: number): Buffer {
  const src = decodePng(file);
  const factor = Math.floor(maxSide / Math.max(src.width, src.height));
  if (factor < 2) return file;
  const width = src.width * factor;
  const height = src.height * factor;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sy = Math.floor(y / factor);
    for (let x = 0; x < width; x++) {
      src.rgba.copy(rgba, (y * width + x) * 4, (sy * src.width + Math.floor(x / factor)) * 4, (sy * src.width + Math.floor(x / factor)) * 4 + 4);
    }
  }
  return encodePng({ width, height, rgba });
}
