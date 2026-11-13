import test from 'node:test';
import assert from 'node:assert/strict';
import { dominantColorRatio, BLANK_IMAGE_THRESHOLD } from '../app/lib/dominant-color.ts';
import { pngDominantRatio } from '../app/lib/png-dominant-ratio.ts';
import { encodePng } from '../app/lib/png-upscale.ts';

const SIDE = 50;

function image(paint: (x: number, y: number) => [number, number, number, number]): Buffer {
  const rgba = Buffer.alloc(SIDE * SIDE * 4);
  for (let y = 0; y < SIDE; y++) {
    for (let x = 0; x < SIDE; x++) {
      const i = (y * SIDE + x) * 4;
      const [r, g, b, a] = paint(x, y);
      rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
    }
  }
  return rgba;
}

const isBorder = (x: number, y: number) => x === 0 || y === 0 || x === SIDE - 1 || y === SIDE - 1;
const whiteWithBorder = (gray: number) =>
  image((x, y) => (isBorder(x, y) ? [gray, gray, gray, 255] : [255, 255, 255, 255]));
const halfBlackHalfWhite = image((x) => (x < SIDE / 2 ? [0, 0, 0, 255] : [255, 255, 255, 255]));

test('dominantColorRatio: branco com borda cinza-clara de 1px fica acima do limite', () => {
  // #F0F0F0 cai na mesma faixa de 16 que o branco
  assert.ok(dominantColorRatio(whiteWithBorder(240)) > BLANK_IMAGE_THRESHOLD);
});

test('dominantColorRatio: borda cinza-media de 1px em 50x50 e 196 px de 2500 (0.9216)', () => {
  assert.equal(dominantColorRatio(whiteWithBorder(128)), 2304 / 2500);
});

test('dominantColorRatio: metade preta e metade branca fica abaixo do limite', () => {
  assert.ok(dominantColorRatio(halfBlackHalfWhite) < BLANK_IMAGE_THRESHOLD);
});

test('dominantColorRatio: imagem toda transparente devolve 1', () => {
  assert.equal(dominantColorRatio(image(() => [10, 200, 30, 0])), 1);
});

test('pngDominantRatio: PNG branco > limite, logo normal < limite, lixo vira null', () => {
  const white = encodePng({ width: SIDE, height: SIDE, rgba: image(() => [255, 255, 255, 255]) });
  assert.ok((pngDominantRatio(white) ?? 0) > BLANK_IMAGE_THRESHOLD);
  const logo = encodePng({ width: SIDE, height: SIDE, rgba: halfBlackHalfWhite });
  assert.ok((pngDominantRatio(logo) ?? 1) < BLANK_IMAGE_THRESHOLD);
  assert.equal(pngDominantRatio(Buffer.from('<html><script>alert(1)</script></html>')), null);
});
