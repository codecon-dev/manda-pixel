import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { decodePng, encodePng, pngChunk, upscalePngNearest, UnsupportedPngError } from '../app/lib/png-upscale.ts';

function checker(width: number, height: number): Buffer {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const on = (i % width + Math.floor(i / width)) % 2 === 0;
    rgba.set(on ? [106, 51, 120, 255] : [252, 217, 83, 255], i * 4);
  }
  return encodePng({ width, height, rgba });
}

test('encode/decode ida e volta preserva pixels', () => {
  const decoded = decodePng(checker(3, 2));
  assert.equal(decoded.width, 3);
  assert.equal(decoded.height, 2);
  assert.deepEqual(Array.from(decoded.rgba.subarray(0, 8)), [106, 51, 120, 255, 252, 217, 83, 255]);
});

test('amplia por fator inteiro sem misturar cores (vizinho mais proximo)', () => {
  const out = decodePng(upscalePngNearest(checker(2, 2), 100));
  assert.equal(out.width, 100);
  assert.equal(out.height, 100);
  assert.deepEqual(Array.from(out.rgba.subarray(49 * 4, 49 * 4 + 4)), [106, 51, 120, 255]);
  assert.deepEqual(Array.from(out.rgba.subarray(50 * 4, 50 * 4 + 4)), [252, 217, 83, 255]);
});

test('decodifica RGB com filtro Sub', () => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(2, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 2;
  const raw = Buffer.from([1, 10, 20, 30, 5, 5, 5]); // filtro 1: segundo pixel = primeiro + 5
  const png = encodePng({ width: 1, height: 1, rgba: Buffer.alloc(4) });
  const ihdrStart = 8;
  const rebuilt = Buffer.concat([
    png.subarray(0, ihdrStart),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  const out = decodePng(rebuilt);
  assert.deepEqual(Array.from(out.rgba), [10, 20, 30, 255, 15, 25, 35, 255]);
});

test('imagem grande nao e ampliada e arquivo invalido lanca erro tipado', () => {
  const big = checker(300, 300);
  assert.equal(upscalePngNearest(big, 380), big);
  assert.throws(() => decodePng(Buffer.from('nao sou png')), UnsupportedPngError);
});
