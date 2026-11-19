import './helpers/temp-data-dir.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createReservedAd, getAdByOrderId, getDataDir, getDb, syncOrderStatusWithGateway } from '../app/lib/db.ts';
import { readOrderStatus, toPublicAd, toPublicOrder } from '../app/lib/order-status.ts';
import { InvalidOrderIdError, applyGatewayOrder, gatewayOrderUrl } from '../app/lib/gateway-sync.ts';
import { removeExpiredAdUpload, sweepExpiredAdUploads } from '../app/lib/ad-image.ts';
import { checkoutReturnNotice } from '../app/lib/checkout-return.ts';

let nextX = 0;
function reserve(orderId: string): void {
  createReservedAd({ order_id: orderId, x: nextX, y: 900, w: 5, h: 5, title: 't', link: 'https://exemplo.com.br' });
  nextX += 5;
}

function uploadPath(orderId: string): string {
  return path.join(getDataDir(), 'uploads', `${orderId}.png`);
}

function writeUpload(orderId: string): void {
  fs.writeFileSync(uploadPath(orderId), Buffer.from('png'));
}

function gatewayStub(status: string, calls: string[]) {
  return async (url: string): Promise<Response> => {
    calls.push(url);
    const body = { orderId: 'x', pixels: 25, value: 25, status, createdAt: new Date().toISOString() };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
}

test('id inválido devolve 400 sem chamar o gateway', async () => {
  for (const bad of ['', '../etc/passwd', 'ABC', 'a/b', 'a?b=1', 'a'.repeat(65), 'id%2F..']) {
    const calls: string[] = [];
    const result = await readOrderStatus(bad, gatewayStub('pending', calls));
    assert.equal(result.httpStatus, 400, bad);
    assert.ok('error' in result.body);
    assert.equal(calls.length, 0);
  }
  assert.equal((await readOrderStatus(42 as unknown)).httpStatus, 400);
});

test('gatewayOrderUrl valida e codifica o id', () => {
  assert.equal(gatewayOrderUrl('abc123', 'http://gw'), 'http://gw/orders/abc123');
  assert.throws(() => gatewayOrderUrl('../x', 'http://gw'), InvalidOrderIdError);
  assert.throws(() => gatewayOrderUrl('a b', 'http://gw'), InvalidOrderIdError);
  assert.throws(() => applyGatewayOrder('../x', { status: 'expired' }), InvalidOrderIdError);
});

test('GET usa encodeURIComponent e não força status (cancelado=1 não altera)', async () => {
  const id = 'statusread1';
  reserve(id);
  const calls: string[] = [];
  const result = await readOrderStatus(id, gatewayStub('pending', calls));
  assert.equal(result.httpStatus, 200);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].endsWith(`/orders/${encodeURIComponent(id)}`));
  assert.ok(!calls[0].includes('?'));
  assert.equal(getAdByOrderId(id)?.status, 'reserved');
});

test('sincronização expired apaga só o PNG do pedido expirado', async () => {
  const expired = 'cleanexpired1';
  const paid = 'cleanpaid1';
  reserve(expired);
  reserve(paid);
  writeUpload(expired);
  writeUpload(paid);

  await readOrderStatus(expired, gatewayStub('expired', []));
  await readOrderStatus(paid, gatewayStub('paid', []));

  assert.equal(getAdByOrderId(expired)?.status, 'expired');
  assert.equal(fs.existsSync(uploadPath(expired)), false);
  assert.equal(fs.existsSync(uploadPath(paid)), true);
  assert.equal(removeExpiredAdUpload(paid), false);
  assert.equal(fs.existsSync(uploadPath(paid)), true);
  assert.equal(removeExpiredAdUpload(expired), false);
});

test('varredura apaga PNG de expired e nunca de paid ou pending', () => {
  const ids = { expired: 'sweepexpired1', paid: 'sweeppaid1', pending: 'sweeppending1', published: 'sweeppub1' };
  for (const id of Object.values(ids)) {
    reserve(id);
    writeUpload(id);
  }
  syncOrderStatusWithGateway(ids.published, { status: 'paid' });
  syncOrderStatusWithGateway(ids.expired, { status: 'expired' });
  getDb().prepare(`UPDATE ads SET status = 'paid' WHERE order_id = ?`).run(ids.paid);
  getDb().prepare(`UPDATE ads SET status = 'pending' WHERE order_id = ?`).run(ids.pending);

  const removed = sweepExpiredAdUploads(true);
  assert.ok(removed >= 1);
  assert.equal(fs.existsSync(uploadPath(ids.expired)), false);
  assert.equal(fs.existsSync(uploadPath(ids.paid)), true);
  assert.equal(fs.existsSync(uploadPath(ids.pending)), true);
  assert.equal(fs.existsSync(uploadPath(ids.published)), true);

  assert.equal(sweepExpiredAdUploads(true), 0);
  assert.equal(sweepExpiredAdUploads(), 0);
});

test('aviso de retorno segue o status lido', () => {
  assert.equal(checkoutReturnNotice('paid')?.resultado, 'sucesso');
  assert.equal(checkoutReturnNotice('pending')?.resultado, 'pendente');
  assert.equal(checkoutReturnNotice('expired')?.resultado, 'expirado');
  assert.equal(checkoutReturnNotice('refunded')?.resultado, 'estornado');
  assert.equal(checkoutReturnNotice('toString'), null);
  assert.equal(checkoutReturnNotice(undefined), null);
  assert.equal(checkoutReturnNotice('pending')?.message.includes('liberada'), false);
});

const ORDER_KEYS = ['orderId', 'status', 'pixels', 'checkoutUrl'];
const AD_KEYS = ['status', 'moderation_status', 'moderation_decision', 'image_path', 'alt_text', 'x', 'y', 'w', 'h', 'link_url'];

function fullGatewayStub(status: string) {
  return async (): Promise<Response> => {
    const body = {
      orderId: 'x', pixels: 25, value: 25, status, createdAt: '2026-11-01T00:00:00Z',
      paidAt: '2026-11-01T00:01:00Z', expiresAt: '2026-11-01T00:30:00Z',
      checkoutUrl: 'https://checkout.exemplo/abc', customer: { name: 'Fulano', email: 'f@x.com', cpf: '000' },
    };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
}

test('resposta pública do gateway só tem campos da whitelist', async () => {
  const id = 'whitelist1';
  reserve(id);
  getDb().prepare(`UPDATE ads SET visitor_id = 'v-secret' WHERE order_id = ?`).run(id);
  const result = await readOrderStatus(id, fullGatewayStub('pending'));
  assert.equal(result.httpStatus, 200);
  assert.ok('order' in result.body);
  const { order, ad } = result.body;
  for (const key of Object.keys(order)) assert.ok(ORDER_KEYS.includes(key), `order.${key}`);
  for (const key of ['value', 'createdAt', 'paidAt', 'expiresAt', 'customer']) assert.equal(key in order, false, key);
  assert.ok(ad);
  for (const key of Object.keys(ad)) assert.ok(AD_KEYS.includes(key), `ad.${key}`);
  for (const key of ['visitor_id', 'dominant_ratio', 'order_id', 'created_at', 'checkout_url', 'x_handle']) {
    assert.equal(key in ad, false, key);
  }
  assert.equal(order.checkoutUrl, 'https://checkout.exemplo/abc');
});

test('toPublicAd descarta campos fora da whitelist da linha do banco', () => {
  const row = {
    order_id: 'a', x: 5, y: 10, w: 5, h: 5, pixels: 25, status: 'published', moderation_status: 'approved',
    moderation_decision: 'approved', image_path: 'a.png', alt_text: 'alt', link_url: 'https://exemplo.com.br',
    visitor_id: 'v1', dominant_ratio: 0.9, created_at: 'c', paid_at: 'p', expires_at: 'e', checkout_url: 'u', title: 't',
  };
  const ad = toPublicAd(row);
  assert.deepEqual(Object.keys(ad ?? {}).sort(), [...AD_KEYS].sort());
  assert.equal(toPublicAd(null), null);
});

test('checkoutUrl só aparece com status pending', () => {
  const base = { orderId: 'a', pixels: 25, value: 25, createdAt: 'c', checkoutUrl: 'https://checkout.exemplo/a' };
  assert.equal(toPublicOrder({ ...base, status: 'pending' }).checkoutUrl, 'https://checkout.exemplo/a');
  for (const status of ['paid', 'expired', 'refunded']) {
    const order = toPublicOrder({ ...base, status });
    assert.equal('checkoutUrl' in order, false, status);
    assert.deepEqual(Object.keys(order).sort(), ['orderId', 'pixels', 'status']);
  }
});

test('chave __proto__ na entrada não vaza nem polui o protótipo', () => {
  const rawOrder = JSON.parse('{"orderId":"a","pixels":25,"status":"pending","__proto__":{"polluted":"sim","value":99}}');
  const rawAd = JSON.parse('{"status":"published","moderation_status":"approved","x":0,"y":0,"w":5,"h":5,"__proto__":{"polluted":"sim","visitor_id":"v"}}');
  const order = toPublicOrder(rawOrder);
  const ad = toPublicAd(rawAd);
  assert.equal(Object.prototype.hasOwnProperty.call(order, '__proto__'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(ad, '__proto__'), false);
  assert.equal('value' in order, false);
  assert.equal(ad && 'visitor_id' in ad, false);
  assert.equal(JSON.stringify(order).includes('polluted'), false);
  assert.equal(JSON.stringify(ad).includes('polluted'), false);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});
