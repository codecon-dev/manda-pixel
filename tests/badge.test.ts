import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBadgeHtml } from '../app/lib/badge.ts';
import { SITE_URL } from '../app/lib/constants.ts';

function hrefOf(html: string): URL {
  const match = html.match(/<a href="([^"]+)"/);
  assert.ok(match, 'html sem href');
  return new URL(match[1]);
}

test('link aponta para a pagina publica do anuncio', () => {
  const url = hrefOf(buildBadgeHtml('62ea0f4224e6'));
  assert.equal(`${url.origin}${url.pathname}`, `${SITE_URL}/a/62ea0f4224e6`);
});

test('link leva ref=selo e abre em nova aba com noopener', () => {
  const html = buildBadgeHtml('abc');
  assert.equal(hrefOf(html).searchParams.get('ref'), 'selo');
  assert.match(html, /target="_blank" rel="noopener"/);
});

test('imagem tem src absoluto, alt e tamanho', () => {
  const html = buildBadgeHtml('abc');
  assert.ok(html.includes(`src="${SITE_URL}/selo-mandapixel.svg"`));
  assert.ok(html.includes('alt="Estou no Manda Pixel"'));
  assert.ok(html.includes('width="180" height="40"'));
});

test('adId e escapado e nao quebra o atributo', () => {
  const html = buildBadgeHtml('a"b/<x>?&y');
  assert.ok(html.includes('/a/a%22b%2F%3Cx%3E%3F%26y?ref=selo'));
  assert.ok(!html.includes('a"b'));
  assert.ok(!html.includes('<x>'));
});
