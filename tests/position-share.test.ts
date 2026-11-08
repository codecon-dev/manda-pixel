import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  positionHeading,
  positionMetaDescription,
  positionMetaTitle,
  positionOgPath,
  positionSharePath,
  snapToBlock,
} from '../app/lib/position-share.ts';
import { parseFocus } from '../app/lib/focus.ts';

test('positionSharePath e positionOgPath montam os caminhos', () => {
  assert.equal(positionSharePath(500, 500), '/?x=500&y=500');
  assert.equal(positionSharePath(0, 999), '/?x=0&y=999');
  assert.equal(positionOgPath(12, 34), '/og/posicao?x=12&y=34');
});

test('titulo e cabecalho em portugues com acento', () => {
  assert.equal(positionHeading(500, 7), 'Posição X: 500, Y: 7');
  assert.equal(positionMetaTitle(500, 500), 'Posição X: 500, Y: 500 no Manda Pixel');
});

test('positionMetaDescription muda com o status', () => {
  assert.match(positionMetaDescription(true), /ainda está livre/);
  assert.match(positionMetaDescription(false), /já tem dono/);
  const neutra = positionMetaDescription(null);
  assert.notEqual(neutra, positionMetaDescription(true));
  assert.notEqual(neutra, positionMetaDescription(false));
});

test('snapToBlock: multiplo de 5 dentro da grade', () => {
  assert.equal(snapToBlock(0), 0);
  assert.equal(snapToBlock(503), 500);
  assert.equal(snapToBlock(999), 995);
  assert.equal(snapToBlock(-3), 0);
});

test('coordenada invalida: quem chama usa parseFocus e nao monta link', () => {
  for (const [x, y] of [['abc', '1'], ['1000', '5'], ['-1', '5'], ['1.5', '2'], [undefined, '3'], [['1', '2'], '3']] as const) {
    assert.equal(parseFocus(x as string | string[] | undefined, y), undefined);
  }
  const ok = parseFocus('500', '500');
  assert.deepEqual(ok, { x: 500, y: 500 });
  assert.equal(positionSharePath(ok!.x, ok!.y), '/?x=500&y=500');
});
