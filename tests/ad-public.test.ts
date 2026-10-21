import './helpers/temp-data-dir.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createReservedAd, getPublicAdById, listLiveAdIds, syncOrderStatusWithGateway } from '../app/lib/db.ts';
import { parseFocus } from '../app/lib/focus.ts';

function reserve(orderId: string, x: number, decision: 'approved' | 'review' = 'approved'): void {
  createReservedAd({
    order_id: orderId, x, y: 500, w: 5, h: 10, image_path: `/api/uploads/${orderId}.png`,
    title: `Anúncio ${orderId}`, link: 'https://exemplo.com.br', moderation_decision: decision,
  });
}

function pay(orderId: string, paidAt: string): void {
  syncOrderStatusWithGateway(orderId, { status: 'paid', paidAt });
}

test('anuncio pago e aprovado retorna dados publicos com numero', () => {
  reserve('adlive1', 0);
  pay('adlive1', '2026-10-20T10:00:00.000Z');
  const ad = getPublicAdById('adlive1');
  assert.ok(ad);
  assert.equal(ad.number, 1);
  assert.equal(ad.orderId, 'adlive1');
  assert.deepEqual([ad.x, ad.y, ad.w, ad.h, ad.pixels], [0, 500, 5, 10, 50]);
  assert.equal(ad.imagePath, '/api/uploads/adlive1.png');
  assert.equal(ad.altText, 'Anúncio adlive1');
  assert.equal(ad.linkUrl, 'https://exemplo.com.br');
  assert.equal(ad.paidAt, '2026-10-20T10:00:00.000Z');
  assert.deepEqual(Object.keys(ad).sort(), [
    'altText', 'h', 'imagePath', 'linkUrl', 'number', 'orderId', 'paidAt', 'pixels', 'w', 'x', 'xHandle', 'y',
  ]);
});

test('pendente, expirado, em revisao, inexistente e id invalido retornam null', () => {
  reserve('adpending', 20);
  reserve('adexpired', 40);
  syncOrderStatusWithGateway('adexpired', { status: 'expired' });
  reserve('adreview', 60, 'review');
  pay('adreview', '2026-10-19T10:00:00.000Z');

  assert.equal(getPublicAdById('adpending'), null);
  assert.equal(getPublicAdById('adexpired'), null);
  assert.equal(getPublicAdById('adreview'), null);
  assert.equal(getPublicAdById('naoexiste'), null);
  assert.equal(getPublicAdById("adlive1' OR '1'='1"), null);
  assert.equal(getPublicAdById('ADLIVE1'), null);
  assert.equal(getPublicAdById(''), null);
  assert.equal(getPublicAdById('a'.repeat(65)), null);
});

test('numeracao segue paid_at, com desempate por order_id', () => {
  reserve('adearly', 80);
  pay('adearly', '2026-10-01T10:00:00.000Z');
  reserve('adtieb', 100);
  pay('adtieb', '2026-10-25T10:00:00.000Z');
  reserve('adtiea', 120);
  pay('adtiea', '2026-10-25T10:00:00.000Z');

  assert.equal(getPublicAdById('adearly')?.number, 1);
  assert.equal(getPublicAdById('adlive1')?.number, 2);
  assert.equal(getPublicAdById('adtiea')?.number, 3);
  assert.equal(getPublicAdById('adtieb')?.number, 4);
  assert.deepEqual(listLiveAdIds().map((a) => a.orderId), ['adearly', 'adlive1', 'adtiea', 'adtieb']);
});

test('parseFocus aceita so inteiros 0-999', () => {
  assert.deepEqual(parseFocus('500', '0'), { x: 500, y: 0 });
  assert.deepEqual(parseFocus('999', '999'), { x: 999, y: 999 });
  assert.equal(parseFocus('1000', '5'), undefined);
  assert.equal(parseFocus('-1', '5'), undefined);
  assert.equal(parseFocus('2.5', '5'), undefined);
  assert.equal(parseFocus('abc', '5'), undefined);
  assert.equal(parseFocus(undefined, '5'), undefined);
  assert.equal(parseFocus(['1', '2'], '5'), undefined);
});
