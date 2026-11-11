import './helpers/temp-data-dir.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createReservedAd, expirePendingByIp, getAdByOrderId, getDb, isAreaAvailable } from '../app/lib/db.ts';
import { hashIp } from '../app/lib/ip-hash.ts';

const future = () => new Date(Date.now() + 30 * 60 * 1000).toISOString();

test('nova reserva do mesmo ip expira a anterior e libera a area', () => {
  const ipHash = hashIp('198.51.100.20');
  assert.ok(ipHash);
  createReservedAd({ order_id: 'ipold1', x: 500, y: 500, w: 10, h: 10, expires_at: future(), ip_hash: ipHash });
  createReservedAd({ order_id: 'ipother1', x: 600, y: 600, w: 10, h: 10, expires_at: future(), ip_hash: hashIp('198.51.100.21') });
  assert.equal(isAreaAvailable(500, 500, 10, 10), false);

  expirePendingByIp(ipHash);

  assert.equal(getAdByOrderId('ipold1')?.status, 'expired');
  assert.equal(getAdByOrderId('ipother1')?.status, 'reserved');
  assert.equal(isAreaAvailable(500, 500, 10, 10), true);
});

test('pedido pago do mesmo ip nao e tocado', () => {
  const ipHash = hashIp('198.51.100.30');
  assert.ok(ipHash);
  createReservedAd({ order_id: 'ippaid1', x: 700, y: 700, w: 5, h: 5, expires_at: future(), ip_hash: ipHash });
  getDb().prepare(`UPDATE ads SET status = 'paid' WHERE order_id = ?`).run('ippaid1');

  expirePendingByIp(ipHash);

  assert.equal(getAdByOrderId('ippaid1')?.status, 'paid');
});
