import test from 'node:test';
import assert from 'node:assert/strict';
import { clampOffset, computeCropRect, defaultCropMode } from '../app/lib/crop-rect.ts';
import type { CropRectInput } from '../types/crop.ts';

const EPS = 1e-9;
const wide: CropRectInput = {
  imgW: 1600, imgH: 900, blockW: 10, blockH: 10, mode: 'contain', zoom: 1, offsetX: 0, offsetY: 0,
};

test('contain: imagem larga cabe inteira no bloco, centralizada na vertical', () => {
  const r = computeCropRect(wide);
  assert.ok(Math.abs(r.w - 10) < EPS);
  assert.ok(Math.abs(r.h - 5.625) < EPS);
  assert.ok(Math.abs(r.x) < EPS);
  assert.ok(Math.abs(r.y - (10 - 5.625) / 2) < EPS);
});

test('cover: imagem larga preenche a altura e corta as laterais por igual', () => {
  const r = computeCropRect({ ...wide, mode: 'cover' });
  assert.ok(Math.abs(r.h - 10) < EPS);
  assert.ok(Math.abs(r.w - 160 / 9) < 1e-6);
  assert.ok(r.x < 0);
  assert.ok(Math.abs(r.x - (10 - r.w) / 2) < EPS);
  assert.ok(Math.abs(r.y) < EPS);
});

test('cover: offset enorme não deixa borda vazia', () => {
  for (const offsetX of [1e6, -1e6]) {
    const r = computeCropRect({ ...wide, mode: 'cover', offsetX, offsetY: 1e6 });
    assert.ok(r.x <= EPS, `esquerda ${r.x}`);
    assert.ok(r.x + r.w >= 10 - EPS, `direita ${r.x + r.w}`);
    assert.ok(Math.abs(r.y) < EPS);
  }
});

test('contain: imagem menor que o bloco não sai dele; com zoom vira cover no eixo que excede', () => {
  const small = computeCropRect({ ...wide, offsetX: 50, offsetY: 50 });
  assert.ok(small.y >= -EPS && small.y + small.h <= 10 + EPS);
  assert.ok(Math.abs(small.x) < EPS);
  // zoom 1.5: 15 x 8.4375, excede só na largura
  const zoomed = computeCropRect({ ...wide, zoom: 1.5, offsetX: 1e6, offsetY: -1e6 });
  assert.ok(Math.abs(zoomed.x) < EPS);
  assert.ok(zoomed.x + zoomed.w >= 10 - EPS);
  assert.ok(zoomed.y >= -EPS && zoomed.y + zoomed.h <= 10 + EPS);
  const off = clampOffset({ ...wide, zoom: 1.5, offsetX: 1e6, offsetY: 0 });
  assert.ok(Math.abs(off.x - 2.5) < EPS);
});

test('mesma proporção do bloco: contain e cover dão o mesmo retângulo', () => {
  const base: CropRectInput = { ...wide, imgW: 800, imgH: 400, blockW: 20, blockH: 10, zoom: 1.5, offsetX: 3, offsetY: -2 };
  assert.deepEqual(computeCropRect({ ...base, mode: 'contain' }), computeCropRect({ ...base, mode: 'cover' }));
});

test('modo padrão: encaixar quando a proporção difere mais de 10%', () => {
  assert.equal(defaultCropMode(1600, 900, 10, 10), 'contain');
  assert.equal(defaultCropMode(1050, 1000, 10, 10), 'cover');
});
