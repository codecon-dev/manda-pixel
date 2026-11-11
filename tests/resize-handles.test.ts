import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getVisibleHandles,
  getHandlePositions,
  hitTestHandles,
  HANDLE_OUTSIDE_OFFSET_PX,
} from '../app/lib/resize-handles.ts';

const sorted = (a: string[]) => [...a].sort();
const CORNERS = ['nw', 'ne', 'sw', 'se'];

test('bloco 10x10 na tela: só a se', () => {
  assert.deepEqual(getVisibleHandles(10, 10), ['se']);
});

test('bloco 50x20 na tela: só a se (menor lado < 28)', () => {
  assert.deepEqual(getVisibleHandles(50, 20), ['se']);
});

test('bloco 30x30: 4 cantos sem lados', () => {
  assert.deepEqual(sorted(getVisibleHandles(30, 30)), sorted(CORNERS));
});

test('bloco 60x30: 4 cantos + n/s', () => {
  assert.deepEqual(sorted(getVisibleHandles(60, 30)), sorted([...CORNERS, 'n', 's']));
});

test('bloco 50x50: 4 cantos + 4 lados', () => {
  assert.deepEqual(sorted(getVisibleHandles(50, 50)), sorted([...CORNERS, 'n', 's', 'e', 'w']));
});

test('bloco compacto: se fica fora do bloco e o hit-test bate com ela', () => {
  const r = { x: 100, y: 100, w: 10, h: 10 };
  const [se] = getHandlePositions(r);
  assert.equal(se.handle, 'se');
  assert.equal(se.x, 110 + HANDLE_OUTSIDE_OFFSET_PX);
  assert.equal(se.y, 110 + HANDLE_OUTSIDE_OFFSET_PX);
  assert.equal(hitTestHandles(se.x, se.y, r), 'se');
  assert.equal(hitTestHandles(105, 105, r), 'move');
  assert.equal(hitTestHandles(100, 100, r), 'move'); // nw escondida não pega
  assert.equal(hitTestHandles(90, 90, r), null);
});

test('hit-test não pega alça de lado escondida', () => {
  const r = { x: 0, y: 0, w: 30, h: 30 };
  assert.equal(hitTestHandles(0, 0, r), 'nw');
  assert.equal(hitTestHandles(15, -10, r), null);
});
