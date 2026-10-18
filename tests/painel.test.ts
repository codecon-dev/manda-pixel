import './helpers/temp-data-dir.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createReservedAd, syncOrderStatusWithGateway } from '../app/lib/db.ts';
import { rejectAd } from '../app/lib/moderation-queue.ts';
import { getPainelStats, computeStats } from '../app/lib/painel.ts';

function reserve(orderId: string, x: number, size: number, decision: 'approved' | 'review' = 'approved'): void {
  createReservedAd({
    order_id: orderId, x, y: 0, w: size, h: size,
    title: `Teste ${orderId}`, link: 'https://exemplo.com.br', moderation_decision: decision,
  });
}

test('banco vazio: tudo zero', () => {
  const stats = getPainelStats();
  assert.equal(stats.soldPixels, 0);
  assert.equal(stats.revenueBRL, 0);
  assert.equal(stats.liveAds, 0);
  assert.equal(stats.pct, 0);
  assert.equal(stats.goalBRL, 1_000_000);
});

test('so pedidos pagos contam; pendente, expirado, rejeitado e estornado nao', () => {
  reserve('paid_live', 0, 5); // 25 px, publicado
  syncOrderStatusWithGateway('paid_live', { status: 'paid' });

  reserve('paid_review', 10, 10, 'review'); // 100 px, pago e em analise
  syncOrderStatusWithGateway('paid_review', { status: 'paid' });

  reserve('still_pending', 30, 5); // reservado, sem pagar

  reserve('expired', 40, 5);
  syncOrderStatusWithGateway('expired', { status: 'expired' });

  reserve('rejected', 50, 5, 'review');
  syncOrderStatusWithGateway('rejected', { status: 'paid' });
  rejectAd('rejected', 'Teste');

  reserve('refunded', 60, 5);
  syncOrderStatusWithGateway('refunded', { status: 'paid' });
  syncOrderStatusWithGateway('refunded', { status: 'refunded' });

  const stats = getPainelStats();
  assert.equal(stats.soldPixels, 125);
  assert.equal(stats.revenueBRL, 125);
  assert.equal(stats.liveAds, 1);
  assert.ok(Math.abs(stats.pct - 0.0125) < 1e-12);
});

test('computeStats: receita = pixels e pct sobre 1.000.000', () => {
  const stats = computeStats([
    { pixels: 25, status: 'published', moderation_status: 'approved' },
    { pixels: 999_975, status: 'paid', moderation_status: 'approved' },
    { pixels: 50, status: 'reserved', moderation_status: 'approved' },
  ]);
  assert.equal(stats.soldPixels, 1_000_000);
  assert.equal(stats.revenueBRL, 1_000_000);
  assert.equal(stats.pct, 100);
  assert.equal(stats.liveAds, 2);
});
