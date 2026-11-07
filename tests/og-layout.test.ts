import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRID_SIDE, markerRect, ogIntegerScale, pixelsLabel, positionLabel } from '../app/lib/og-layout.ts';

test('ogIntegerScale: fator inteiro >= 1 que cabe na caixa', () => {
  assert.equal(ogIntegerScale(5, 5, 400), 80);
  assert.equal(ogIntegerScale(2000, 10, 400), 1);
  assert.equal(ogIntegerScale(0, 0, 400), 400);
  for (const [w, h] of [[5, 5], [35, 10], [123, 77], [380, 200]]) {
    const s = ogIntegerScale(w, h, 380);
    assert.ok(Number.isInteger(s) && s >= 1);
    assert.ok(Math.max(w, h) * s <= 380);
  }
});

test('pixelsLabel: singular e milhar com ponto', () => {
  assert.equal(pixelsLabel(1), '1 pixel');
  assert.equal(pixelsLabel(25), '25 pixels');
  assert.equal(pixelsLabel(2500), '2.500 pixels');
});

test('positionLabel', () => {
  assert.equal(positionLabel(10, 20), 'na posição (10, 20)');
});

test('markerRect: anuncio no canto fica dentro do mapa com tamanho minimo', () => {
  const r = markerRect({ x: 995, y: 995, w: 5, h: 5 }, 200);
  assert.equal(r.width, 14);
  assert.equal(r.height, 14);
  assert.ok(r.left >= 0 && r.left + r.width <= 200);
  assert.ok(r.top >= 0 && r.top + r.height <= 200);
});

test('markerRect: anuncio no centro cai no centro do mapa', () => {
  const side = 100;
  const c = (GRID_SIDE - side) / 2;
  const r = markerRect({ x: c, y: c, w: side, h: side }, 200);
  assert.equal(r.left + r.width / 2, 100);
  assert.equal(r.top + r.height / 2, 100);
});
