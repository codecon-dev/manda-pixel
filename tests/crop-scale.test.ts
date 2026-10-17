import test from 'node:test';
import assert from 'node:assert/strict';
import { cropScale } from '../app/lib/crop-scale.ts';
import { validateAdPng } from '../app/lib/upload-validation.ts';

test('cropScale amplia blocos pequenos e limita o lado a 1000', () => {
  assert.equal(cropScale(5, 5), 20);
  assert.equal(cropScale(50, 50), 20);
  assert.equal(cropScale(100, 100), 10);
  assert.equal(cropScale(1000, 1000), 1);
  assert.equal(cropScale(50, 20), 20);
});

test('validateAdPng aceita PNG e recusa outro formato ou arquivo grande', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(validateAdPng(png), null);
  assert.match(validateAdPng(Buffer.from('GIF89a')) ?? '', /PNG/);
  const big = Buffer.alloc(5 * 1024 * 1024 + 1);
  png.copy(big);
  assert.match(validateAdPng(big) ?? '', /5 MB/);
});
