import test from 'node:test';
import assert from 'node:assert/strict';
import { selectionStartFromCamera } from '../app/lib/selection-start.ts';

test('selectionStartFromCamera centraliza o bloco no centro da câmera', () => {
  assert.deepEqual(selectionStartFromCamera({ x: 500, y: 500 }, 10, 10), { x: 495, y: 495 });
  assert.deepEqual(selectionStartFromCamera({ x: 123.6, y: 801.2 }, 10, 10), { x: 119, y: 796 });
});

test('selectionStartFromCamera limita a seleção a 0..990', () => {
  assert.deepEqual(selectionStartFromCamera({ x: -50, y: 2 }, 10, 10), { x: 0, y: 0 });
  assert.deepEqual(selectionStartFromCamera({ x: 1200, y: 999 }, 10, 10), { x: 990, y: 990 });
});
