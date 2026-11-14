import test from 'node:test';
import assert from 'node:assert/strict';
import { cropScale } from '../app/lib/crop-scale.ts';
import { validateAdPng } from '../app/lib/upload-validation.ts';
import { AD_CARD_IMAGE_MAX, BLOCK_SIZE, CROP_MAX_SIDE, GRID_SIDE } from '../app/lib/constants.ts';

test('cropScale amplia blocos pequenos e limita o lado a 1000', () => {
  assert.equal(cropScale(5, 5), 64);
  assert.ok(5 * cropScale(5, 5) >= 320);
  assert.equal(cropScale(10, 10), 64);
  assert.equal(cropScale(50, 50), 20);
  assert.equal(cropScale(100, 100), 10);
  assert.equal(cropScale(1000, 1000), 1);
  assert.equal(cropScale(50, 20), 20);
});

test('cropScale nunca passa do lado máximo e deixa o bloco 5x5 nítido no card 2x', () => {
  for (let tw = BLOCK_SIZE; tw <= GRID_SIDE; tw += BLOCK_SIZE) {
    for (let th = BLOCK_SIZE; th <= GRID_SIDE; th += BLOCK_SIZE) {
      const s = cropScale(tw, th);
      if (s > 1) assert.ok(Math.max(tw, th) * s <= CROP_MAX_SIDE, `${tw}x${th} escala ${s}`);
    }
  }
  assert.ok(cropScale(BLOCK_SIZE, BLOCK_SIZE) * BLOCK_SIZE >= 2 * AD_CARD_IMAGE_MAX);
});

test('validateAdPng aceita PNG e recusa outro formato ou arquivo grande', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(validateAdPng(png), null);
  assert.match(validateAdPng(Buffer.from('GIF89a')) ?? '', /PNG/);
  const big = Buffer.alloc(5 * 1024 * 1024 + 1);
  png.copy(big);
  assert.match(validateAdPng(big) ?? '', /5 MB/);
});
