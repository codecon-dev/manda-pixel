import './helpers/temp-data-dir.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createReservedAd, getDb, getPublicAdById, syncOrderStatusWithGateway } from '../app/lib/db.ts';
import {
  getLiveAdLink, getTotalClicks, incrementAdClicks, isBotUserAgent, resolveAdRedirect,
} from '../app/lib/ad-clicks.ts';
import { adClickPath } from '../app/lib/ad-rules.ts';

const BROWSER_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const LINK = 'https://anunciante.com.br/promo?x=1';

function publish(orderId: string, x: number, link = LINK, decision: 'approved' | 'review' = 'approved'): void {
  createReservedAd({ order_id: orderId, x, y: 900, w: 5, h: 5, link, title: orderId, moderation_decision: decision });
  syncOrderStatusWithGateway(orderId, { status: 'paid', paidAt: '2026-10-21T10:00:00.000Z' });
}

function clicksOf(orderId: string): number {
  const row = getDb().prepare('SELECT clicks FROM ads WHERE order_id = ?').get(orderId) as { clicks: number };
  return Number(row.clicks);
}

publish('clklive', 0);
publish('clklive2', 5, 'https://outro.com.br');
publish('clkreview', 10, LINK, 'review');
publish('clkreject', 15);
getDb().prepare("UPDATE ads SET moderation_status = 'rejected' WHERE order_id = 'clkreject'").run();
publish('clkjs', 20, 'javascript:alert(1)');
createReservedAd({ order_id: 'clkpending', x: 25, y: 900, w: 5, h: 5, link: LINK, title: 'p' });

test('anuncio no ar: 302 para o link do banco e conta 1 clique', () => {
  const result = resolveAdRedirect('clklive', BROWSER_UA);
  assert.deepEqual(result, { status: 302, location: LINK });
  assert.equal(clicksOf('clklive'), 1);
  assert.equal(getPublicAdById('clklive')?.clicks, 1);
});

test('id inexistente, invalido, nao aprovado, pendente ou com link perigoso: 404 sem contar', () => {
  const hostile = [
    'naoexiste', 'CLKLIVE', '../clklive', 'clklive?u=https://evil.com', '//evil.com', '', 'a'.repeat(65),
    '__proto__', 'clkreview', 'clkreject', 'clkpending', 'clkjs',
  ];
  for (const id of hostile) {
    assert.deepEqual(resolveAdRedirect(id, BROWSER_UA), { status: 404 }, id);
  }
  for (const id of ['clkreview', 'clkreject', 'clkpending', 'clkjs']) assert.equal(clicksOf(id), 0, id);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test('user-agent de robo e preview redireciona mas nao conta', () => {
  const before = clicksOf('clklive2');
  for (const ua of ['Googlebot/2.1', 'facebookexternalhit/1.1', 'Slackbot-LinkExpanding', 'HeadlessChrome/120', 'Twitterbot']) {
    assert.ok(isBotUserAgent(ua), ua);
    assert.deepEqual(resolveAdRedirect('clklive2', ua), { status: 302, location: 'https://outro.com.br/' });
  }
  assert.equal(clicksOf('clklive2'), before);
  assert.equal(isBotUserAgent(BROWSER_UA), false);
  assert.equal(isBotUserAgent(null), false);
});

test('incremento direto so pega anuncio no ar e getLiveAdLink so devolve link no ar', () => {
  incrementAdClicks('clkreview');
  incrementAdClicks('clkreject');
  incrementAdClicks("clklive' OR 1=1 --");
  assert.equal(clicksOf('clkreview'), 0);
  assert.equal(clicksOf('clkreject'), 0);
  assert.equal(getLiveAdLink('clkreview'), null);
  assert.equal(getLiveAdLink('clklive'), LINK);
});

test('getTotalClicks soma so anuncios no ar', () => {
  getDb().prepare("UPDATE ads SET clicks = 50 WHERE order_id = 'clkreject'").run();
  resolveAdRedirect('clklive2', BROWSER_UA);
  resolveAdRedirect('clklive2', BROWSER_UA);
  assert.equal(getTotalClicks(), clicksOf('clklive') + clicksOf('clklive2'));
  assert.equal(getTotalClicks(), 3);
});

test('caminho do clique escapa o id', () => {
  assert.equal(adClickPath('abc123'), '/r/abc123');
  assert.equal(adClickPath('a/b?c'), '/r/a%2Fb%3Fc');
});
