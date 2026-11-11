import './helpers/temp-data-dir.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createReservedAd, getAdByOrderId, getDataDir, getDb, syncOrderStatusWithGateway } from '../app/lib/db.ts';
import { readOrderStatus } from '../app/lib/order-status.ts';
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
