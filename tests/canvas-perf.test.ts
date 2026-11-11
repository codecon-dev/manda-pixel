import test from 'node:test';
import assert from 'node:assert/strict';
import { cellChanged, computeCanvasDpr, shouldDrawFineGrid } from '../app/lib/canvas-perf.ts';

test('celular 400x800 com dpr 3 fica em 2', () => {
  assert.equal(computeCanvasDpr(400, 800, 3), 2);
});

test('desktop 1280x800 com dpr 2 fica perto de 1.397', () => {
  assert.ok(Math.abs(computeCanvasDpr(1280, 800, 2) - 1.3975) < 0.001);
});

test('tela 4K com dpr 2 fica no piso 1', () => {
  assert.equal(computeCanvasDpr(3840, 2160, 2), 1);
});

test('dpr ausente ou zero vira 1', () => {
  assert.equal(computeCanvasDpr(400, 800, undefined), 1);
  assert.equal(computeCanvasDpr(400, 800, 0), 1);
});

test('grade fina só a partir de 1.2x', () => {
  assert.equal(shouldDrawFineGrid(1), false);
  assert.equal(shouldDrawFineGrid(1.2), true);
  assert.equal(shouldDrawFineGrid(4), true);
});

test('cellChanged: de null para célula muda', () => {
  assert.equal(cellChanged(null, { x: 5, y: 10 }), true);
  assert.equal(cellChanged(null, null), false);
});

test('cellChanged: mesma célula ou mesmo bloco não muda', () => {
  assert.equal(cellChanged({ x: 5, y: 10 }, { x: 5, y: 10 }), false);
  assert.equal(cellChanged({ id: 'a' }, { id: 'a' }), false);
});

test('cellChanged: células, blocos ou tipos diferentes mudam', () => {
  assert.equal(cellChanged({ x: 5, y: 10 }, { x: 10, y: 10 }), true);
  assert.equal(cellChanged({ id: 'a' }, { id: 'b' }), true);
  assert.equal(cellChanged({ id: 'a' }, { x: 0, y: 0 }), true);
});
