import './helpers/temp-data-dir.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ADVERTISER_NAME_MAX, buildAdvertiserList } from '../app/lib/advertisers.ts';
import { createReservedAd, getPublicAdById, listLiveAdRefs, syncOrderStatusWithGateway } from '../app/lib/db.ts';
import type { AdvertiserSource, LiveAdRef } from '../types/advertisers.ts';

const live: LiveAdRef[] = [
  { orderId: 'bbb', paidAt: '2026-10-21T10:00:00.000Z' },
  { orderId: 'aaa', paidAt: '2026-10-20T10:00:00.000Z' },
  { orderId: 'ccc', paidAt: '2026-10-22T10:00:00.000Z' },
];

function block(id: string, extra: Partial<AdvertiserSource> = {}): AdvertiserSource {
  return { id, state: 'published', ...extra };
}

test('altText vazio ou so espacos vira "Anúncio #N"', () => {
  const list = buildAdvertiserList([block('aaa', { altText: '   ' }), block('bbb')], live);
  assert.deepEqual(list.map((a) => a.name), ['Anúncio #1', 'Anúncio #2']);
});

test('nome aparado e cortado em 80 caracteres', () => {
  const list = buildAdvertiserList([block('aaa', { altText: `  ${'x'.repeat(200)}  ` })], live);
  assert.equal(list[0].name.length, ADVERTISER_NAME_MAX);
  assert.equal(list[0].name, 'x'.repeat(80));
});

test('dominio sem www; URL invalida ou de outro esquema vira vazio', () => {
  const list = buildAdvertiserList([
    block('aaa', { linkUrl: 'https://www.exemplo.com/x' }),
    block('bbb', { linkUrl: 'isso nao e url' }),
    block('ccc', { linkUrl: 'javascript:alert(1)' }),
  ], live);
  assert.deepEqual(list.map((a) => a.domain), ['exemplo.com', '', '']);
});

test('ordena por numero, calculado como em /a/[id] (paid_at, depois id)', () => {
  const list = buildAdvertiserList([block('ccc'), block('aaa'), block('bbb')], live);
  assert.deepEqual(list.map((a) => [a.id, a.number]), [['aaa', 1], ['bbb', 2], ['ccc', 3]]);
  const tie = buildAdvertiserList([block('zz2'), block('zz1')], [
    { orderId: 'zz2', paidAt: null }, { orderId: 'zz1', paidAt: null },
  ]);
  assert.deepEqual(tie.map((a) => a.id), ['zz1', 'zz2']);
});

test('usa number do bloco quando existe', () => {
  const list = buildAdvertiserList([block('aaa', { number: 9 }), block('bbb', { number: 4 })], live);
  assert.deepEqual(list.map((a) => [a.id, a.number]), [['bbb', 4], ['aaa', 9]]);
});

test('ignora bloco fora do ar, nao publicado ou com id que /a/[id] recusa', () => {
  const list = buildAdvertiserList([
    block('aaa', { state: 'reserved' }),
    block('fora'),
    block('../x'),
    block('bbb'),
  ], [...live, { orderId: '../x', paidAt: null }]);
  assert.deepEqual(list.map((a) => a.id), ['bbb']);
});

test('saida so com chaves da whitelist, sem dado de comprador', () => {
  const dirty = {
    ...block('aaa', { altText: 'Loja', linkUrl: 'https://loja.com' }),
    email: 'a@b.com', buyerName: 'Fulano', price: 25, visitor_id: 'v1', xHandle: 'loja',
  } as AdvertiserSource;
  const [ad] = buildAdvertiserList([dirty], live);
  assert.deepEqual(Object.keys(ad).sort(), ['domain', 'href', 'id', 'name', 'number']);
  assert.equal(ad.href, '/a/aaa');
});

test('nome com HTML fica como texto (escapado pelo JSX, nao pela funcao)', () => {
  const [ad] = buildAdvertiserList([block('aaa', { altText: '<script>alert(1)</script>' })], live);
  assert.equal(ad.name, '<script>alert(1)</script>');
});

test('numero da lista bate com o de getPublicAdById (/a/[id])', () => {
  const ids = ['dbz', 'dba', 'dbm'];
  ids.forEach((id, i) => {
    createReservedAd({
      order_id: id, x: i * 5, y: 900, w: 5, h: 5, image_path: `/api/uploads/${id}.png`,
      title: `Loja ${id}`, link: 'https://exemplo.com.br', moderation_decision: 'approved',
    });
    syncOrderStatusWithGateway(id, { status: 'paid', paidAt: i === 2 ? '2026-10-01T00:00:00.000Z' : '2026-10-02T00:00:00.000Z' });
  });
  const list = buildAdvertiserList(ids.map((id) => block(id)), listLiveAdRefs());
  for (const ad of list) assert.equal(ad.number, getPublicAdById(ad.id)?.number);
  assert.deepEqual(list.map((a) => a.id), ['dbm', 'dba', 'dbz']);
});
