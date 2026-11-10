import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nearestFree,
  overlaps,
  previewWindowSize,
  priceLabel,
  snapRect,
  toCanvasRect,
  viewWindow,
} from '../app/lib/logo-preview.ts';
import type { GridBlock } from '../app/lib/db.ts';

function block(x: number, y: number, w: number, h: number): GridBlock {
  return { id: `${x}-${y}`, x, y, w, h, pixels: w * h, state: 'published' };
}

test('viewWindow trava no canto (0,0)', () => {
  assert.deepEqual(viewWindow(0, 0, 5), { x: 0, y: 0, size: 200 });
});

test('viewWindow trava no canto (995,995)', () => {
  assert.deepEqual(viewWindow(995, 995, 5), { x: 800, y: 800, size: 200 });
});

test('viewWindow centra o retangulo no meio da grade', () => {
  assert.deepEqual(viewWindow(500, 500, 10), { x: 405, y: 405, size: 200 });
});

test('previewWindowSize perto: 20x20 da janela de 100', () => {
  assert.equal(previewWindowSize(20, 20, 'perto'), 100);
});

test('previewWindowSize perto: 5x5 respeita o minimo de 60', () => {
  assert.equal(previewWindowSize(5, 5, 'perto'), 60);
});

test('previewWindowSize perto: 300x300 trava na grade inteira', () => {
  assert.equal(previewWindowSize(300, 300, 'perto'), 1000);
});

test('previewWindowSize grade: sempre a grade inteira', () => {
  assert.equal(previewWindowSize(20, 20, 'grade'), 1000);
});

test('previewWindowSize medio: 20x20 da 240', () => {
  assert.equal(previewWindowSize(20, 20, 'medio'), 240);
});

test('viewWindow com zoom trava na borda (logo em x=990)', () => {
  const win = viewWindow(990, 500, 10, previewWindowSize(10, 10, 'perto'));
  assert.deepEqual(win, { x: 940, y: 475, size: 60 });
});

test('viewWindow na grade inteira comeca em (0,0)', () => {
  assert.deepEqual(viewWindow(990, 990, 10, 1000), { x: 0, y: 0, size: 1000 });
});

test('toCanvasRect escala a janela para o canvas', () => {
  const r = toCanvasRect({ x: 10, y: 20, w: 20, h: 20 }, { x: 0, y: 0, size: 200 }, 600);
  assert.deepEqual(r, { x: 30, y: 60, w: 60, h: 60 });
});

test('overlaps detecta cruzamento e encosto sem cruzar', () => {
  const blocks = [block(100, 100, 10, 10)];
  assert.equal(overlaps({ x: 105, y: 105, w: 10, h: 10 }, blocks), true);
  assert.equal(overlaps({ x: 110, y: 100, w: 10, h: 10 }, blocks), false);
});

test('nearestFree devolve o proprio lugar se estiver livre', () => {
  const r = { x: 0, y: 0, w: 5, h: 5 };
  assert.deepEqual(nearestFree(r, [block(100, 100, 5, 5)]), r);
});

test('nearestFree pula bloco ocupado para o vizinho mais perto', () => {
  const blocks = [block(500, 500, 5, 5)];
  const r = nearestFree({ x: 500, y: 500, w: 5, h: 5 }, blocks);
  assert.equal(overlaps(r, blocks), false);
  assert.equal(Math.abs(r.x - 500) + Math.abs(r.y - 500), 5);
});

test('nearestFree tira da area ocupada um quadrado maior', () => {
  const blocks = [block(480, 480, 40, 40)];
  const r = nearestFree({ x: 490, y: 490, w: 20, h: 20 }, blocks);
  assert.equal(overlaps(r, blocks), false);
  assert.equal(r.x % 5, 0);
  assert.equal(r.y % 5, 0);
});

test('snapRect encaixa em multiplo de 5 e mantem dentro da grade', () => {
  assert.deepEqual(snapRect(503, 997, 50), { x: 500, y: 950, w: 50, h: 50 });
});

test('priceLabel formata em reais pt-BR', () => {
  assert.equal(priceLabel(2500), 'R$ 2.500,00');
  assert.equal(priceLabel(25), 'R$ 25,00');
});
