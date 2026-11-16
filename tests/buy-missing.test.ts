import test from 'node:test';
import assert from 'node:assert/strict';
import { listMissing } from '../app/lib/buy-missing.ts';

test('tudo vazio sem imagem lista tudo em ordem', () => {
  const missing = listMissing({ image: 'x', title: 'x', linkUrl: 'x', terms: 'x' }, false);
  assert.deepEqual(missing, ['imagem', 'título', 'link', 'aceitar os termos']);
});

test('tudo ok com imagem nao falta nada', () => {
  assert.deepEqual(listMissing({}, true), []);
});

test('erro de imagem com hasImage true aparece uma vez', () => {
  const missing = listMissing({ image: 'x' }, true);
  assert.equal(missing.filter((m) => m === 'imagem').length, 1);
});

test('sem imagem e com erro de imagem nao duplica', () => {
  assert.deepEqual(listMissing({ image: 'x' }, false), ['imagem']);
});

test('so termos', () => {
  assert.deepEqual(listMissing({ terms: 'x' }, true), ['aceitar os termos']);
});
