import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDb,
  createReservedAd,
  getAdByOrderId,
  syncOrderStatusWithGateway,
  isAreaAvailable,
  getGridState,
} from '../app/lib/db.ts';
import {
  listAdsInReview,
  approveAd,
  rejectAd,
  getModerationStats,
} from '../app/lib/moderation-queue.ts';

test('Fluxo completo de sincronização e moderação manual', async (t) => {
  const db = getDb();

  await t.test('1. Pedido pending -> paid com moderação approved publica na grade imediatamente', () => {
    const orderId = `test_order_app_${Date.now()}`;
    createReservedAd({
      order_id: orderId,
      x: 50,
      y: 50,
      w: 10,
      h: 10,
      title: 'Pixel Teste Aprovado Direto',
      link: 'https://exemplo.com.br',
      moderation_decision: 'approved',
    });

    const adBefore = getAdByOrderId(orderId);
    assert.equal(adBefore?.status, 'reserved');

    const synced = syncOrderStatusWithGateway(orderId, {
      status: 'paid',
      paidAt: new Date().toISOString(),
    });

    assert.equal(synced?.status, 'published');

    const grid = getGridState();
    const publishedBlock = grid.blocks.find((b) => b.id === orderId);
    assert.ok(publishedBlock);
    assert.equal(publishedBlock?.state, 'published');
  });

  await t.test('2. Pedido pending -> paid com moderação review fica in_review e entra na fila', () => {
    const orderId = `test_order_rev_${Date.now()}`;
    createReservedAd({
      order_id: orderId,
      x: 100,
      y: 100,
      w: 15,
      h: 15,
      title: 'Pixel Teste Para Moderação',
      link: 'https://exemplo2.com.br',
      moderation_decision: 'review',
    });

    const synced = syncOrderStatusWithGateway(orderId, {
      status: 'paid',
      paidAt: new Date().toISOString(),
    });

    assert.equal(synced?.status, 'in_review');

    // Aparece na fila de moderação manual
    const queue = listAdsInReview();
    const queueItem = queue.find((item) => item.orderId === orderId);
    assert.ok(queueItem, 'Deveria estar na fila de moderação');
    assert.equal(queueItem?.status, 'in_review');

    // Na grade aparece como in_review
    const grid = getGridState();
    const block = grid.blocks.find((b) => b.id === orderId);
    assert.ok(block);
    assert.equal(block?.state, 'in_review');
  });

  await t.test('3. approveAd(orderId) publica o anúncio na grade', () => {
    const orderId = `test_order_approve_${Date.now()}`;
    createReservedAd({
      order_id: orderId,
      x: 200,
      y: 200,
      w: 20,
      h: 20,
      title: 'Aguardando Aprovação',
      link: 'https://exemplo3.com.br',
      moderation_decision: 'review',
    });

    syncOrderStatusWithGateway(orderId, {
      status: 'paid',
      paidAt: new Date().toISOString(),
    });

    const item = approveAd(orderId);
    assert.equal(item.status, 'published');
    assert.equal(item.moderationStatus, 'approved');

    // Não deve mais estar na fila de pendentes
    const queue = listAdsInReview();
    assert.equal(queue.some((i) => i.orderId === orderId), false);

    // Na grade deve estar como published
    const grid = getGridState();
    const block = grid.blocks.find((b) => b.id === orderId);
    assert.ok(block);
    assert.equal(block?.state, 'published');
  });

  await t.test('4. rejectAd(orderId, reason) recusa e libera a área na grade', () => {
    const orderId = `test_order_reject_${Date.now()}`;
    createReservedAd({
      order_id: orderId,
      x: 300,
      y: 300,
      w: 25,
      h: 25,
      title: 'Será Recusado',
      link: 'https://exemplo4.com.br',
      moderation_decision: 'review',
    });

    syncOrderStatusWithGateway(orderId, {
      status: 'paid',
      paidAt: new Date().toISOString(),
    });

    // Área está ocupada antes da recusa
    assert.equal(isAreaAvailable(300, 300, 25, 25), false);

    const item = rejectAd(orderId, 'Violação de regras');
    assert.equal(item.status, 'rejected');
    assert.equal(item.moderationStatus, 'rejected');

    // Área foi liberada na grade
    assert.equal(isAreaAvailable(300, 300, 25, 25), true);

    // Não está mais na fila de moderação pendente
    const queue = listAdsInReview();
    assert.equal(queue.some((i) => i.orderId === orderId), false);

    // Não consta como bloco ocupado na grade
    const grid = getGridState();
    assert.equal(grid.blocks.some((b) => b.id === orderId), false);
  });

  await t.test('5. Transição para expired e refunded libera os pixels', () => {
    const orderExpired = `test_order_exp_${Date.now()}`;
    createReservedAd({
      order_id: orderExpired,
      x: 400,
      y: 400,
      w: 10,
      h: 10,
      title: 'Vai Expirar',
      link: 'https://exemplo5.com.br',
      moderation_decision: 'approved',
    });

    syncOrderStatusWithGateway(orderExpired, { status: 'expired' });
    assert.equal(isAreaAvailable(400, 400, 10, 10), true);

    const orderRefunded = `test_order_ref_${Date.now()}`;
    createReservedAd({
      order_id: orderRefunded,
      x: 450,
      y: 450,
      w: 10,
      h: 10,
      title: 'Vai Ser Estornado',
      link: 'https://exemplo6.com.br',
      moderation_decision: 'approved',
    });

    syncOrderStatusWithGateway(orderRefunded, { status: 'paid' });
    assert.equal(isAreaAvailable(450, 450, 10, 10), false);

    syncOrderStatusWithGateway(orderRefunded, { status: 'refunded' });
    assert.equal(isAreaAvailable(450, 450, 10, 10), true);
  });
});
