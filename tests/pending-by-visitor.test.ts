import './helpers/temp-data-dir.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createReservedAd, expirePendingByVisitor, getAdByOrderId, getDb, isAreaAvailable } from '../app/lib/db.ts';
import { newVisitorId, parseVisitorId, resolveVisitorId } from '../app/lib/visitor-id.ts';

const future = () => new Date(Date.now() + 30 * 60 * 1000).toISOString();

/** Mesmo fluxo da rota POST /api/orders: expira as reservas do visitante e cria a nova. */
function reserve(cookie: string | undefined, orderId: string, x: number, y: number): string {
  const visitorId = resolveVisitorId(cookie);
  expirePendingByVisitor(visitorId);
  createReservedAd({ order_id: orderId, x, y, w: 10, h: 10, expires_at: future(), visitor_id: visitorId });
  return visitorId;
}

test('dois visitantes com cookies diferentes mantem as duas reservas', () => {
  const a = reserve(newVisitorId(), 'vida1', 100, 100);
  const b = reserve(newVisitorId(), 'vidb1', 200, 200);
  assert.notEqual(a, b);
  assert.equal(getAdByOrderId('vida1')?.status, 'reserved');
  assert.equal(getAdByOrderId('vidb1')?.status, 'reserved');
});

test('mesmo visitante com 2 pedidos: o primeiro expira e libera a area', () => {
  const cookie = newVisitorId();
  reserve(cookie, 'vidsame1', 300, 300);
  reserve(cookie, 'vidsame2', 400, 400);
  assert.equal(getAdByOrderId('vidsame1')?.status, 'expired');
  assert.equal(getAdByOrderId('vidsame2')?.status, 'reserved');
  assert.equal(isAreaAvailable(300, 300, 10, 10), true);
});

test('cookie ausente ou invalido gera UUID novo e nao expira reserva de ninguem', () => {
  const other = reserve(newVisitorId(), 'vidother1', 500, 500);
  const fromMissing = reserve(undefined, 'vidnew1', 600, 600);
  const fromInvalid = reserve('nao-e-uuid', 'vidnew2', 700, 700);
  assert.ok(parseVisitorId(fromMissing));
  assert.ok(parseVisitorId(fromInvalid));
  assert.notEqual(fromMissing, other);
  assert.notEqual(fromInvalid, fromMissing);
  for (const id of ['vidother1', 'vidnew1', 'vidnew2', 'vida1', 'vidb1', 'vidsame2']) {
    assert.equal(getAdByOrderId(id)?.status, 'reserved', id);
  }
});

test('parseVisitorId recusa o que nao e UUID v4', () => {
  assert.equal(parseVisitorId(undefined), null);
  assert.equal(parseVisitorId(''), null);
  assert.equal(parseVisitorId('203.0.113.7'), null);
  assert.equal(parseVisitorId('xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'), null);
  assert.equal(parseVisitorId('123e4567-e89b-12d3-a456-426614174000'), null);
  assert.equal(parseVisitorId("' OR 1=1 --"), null);
  const id = newVisitorId();
  assert.equal(parseVisitorId(id), id);
  assert.equal(parseVisitorId(id.toUpperCase()), id);
});

test('pedido pago do mesmo visitante nao e tocado', () => {
  const cookie = newVisitorId();
  reserve(cookie, 'vidpaid1', 800, 800);
  getDb().prepare(`UPDATE ads SET status = 'paid' WHERE order_id = ?`).run('vidpaid1');
  expirePendingByVisitor(cookie);
  assert.equal(getAdByOrderId('vidpaid1')?.status, 'paid');
});
