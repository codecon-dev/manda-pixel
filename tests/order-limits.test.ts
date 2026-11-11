import test from 'node:test';
import assert from 'node:assert/strict';
import { exceedsOrderLimit, getClientIp, MAX_ORDER_PIXELS } from '../app/lib/order-limits.ts';
import { hashIp } from '../app/lib/ip-hash.ts';

const headers = (h: Record<string, string>) => new Headers(h);

test('teto de pixels por pedido', () => {
  assert.equal(MAX_ORDER_PIXELS, 50000);
  assert.equal(exceedsOrderLimit(250, 200), false);
  assert.equal(exceedsOrderLimit(5, 10000), false);
  assert.equal(exceedsOrderLimit(250, 205), true);
  assert.equal(exceedsOrderLimit(1000, 450), true);
});

test('hash do ip estavel no mesmo dia e diferente em outro dia', () => {
  const d1 = new Date('2026-11-10T03:00:00Z');
  const d1b = new Date('2026-11-10T22:00:00Z');
  const d2 = new Date('2026-11-11T03:00:00Z');
  const a = hashIp('203.0.113.7', d1);
  assert.ok(a && /^[0-9a-f]{64}$/.test(a));
  assert.equal(a, hashIp('203.0.113.7', d1b));
  assert.notEqual(a, hashIp('203.0.113.7', d2));
  assert.notEqual(a, hashIp('203.0.113.8', d1));
  assert.ok(!a.includes('203.0.113.7'));
  assert.equal(hashIp('', d1), null);
  assert.equal(hashIp('   ', d1), null);
});

test('extracao de ip dos headers', () => {
  assert.equal(getClientIp(headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })), '1.2.3.4');
  assert.equal(getClientIp(headers({ 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '9.9.9.9' })), '1.2.3.4');
  assert.equal(getClientIp(headers({ 'x-real-ip': '9.9.9.9' })), '9.9.9.9');
  assert.equal(getClientIp(headers({})), '');
});
