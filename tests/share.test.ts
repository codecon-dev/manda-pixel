import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShareUrl, shareText, X_INTENT_URL, SHAREABLE_ORDER_STATUSES } from '../app/lib/share.ts';
import { SITE_URL } from '../app/lib/constants.ts';

function parse(href: string): URL {
  return new URL(href);
}

test('aponta para o intent do X com a url publica do anuncio', () => {
  const href = buildShareUrl({ adId: 'abc123', pixels: 25, variant: 'comprador' });
  const url = parse(href);
  assert.equal(`${url.origin}${url.pathname}`, X_INTENT_URL);
  assert.equal(url.searchParams.get('url'), `${SITE_URL}/a/abc123`);
});

test('texto do comprador traz o numero de pixels', () => {
  const url = parse(buildShareUrl({ adId: 'abc123', pixels: 2500, variant: 'comprador' }));
  assert.equal(
    url.searchParams.get('text'),
    'Meu anúncio está no Manda Pixel: 2.500 pixels no mural de 1 milhão, no ar pra sempre',
  );
});

test('texto do visitante e fixo', () => {
  const url = parse(buildShareUrl({ adId: 'abc123', pixels: 2500, variant: 'visitante' }));
  assert.equal(url.searchParams.get('text'), 'Olha esse anúncio no Manda Pixel, o mural de 1 milhão de pixels');
  assert.equal(url.searchParams.get('text'), shareText('visitante', 1));
});

test('texto vai codificado: sem espaco, acento ou dois-pontos cru na query', () => {
  const href = buildShareUrl({ adId: 'abc123', pixels: 25, variant: 'comprador' });
  const query = href.slice(href.indexOf('?') + 1);
  assert.doesNotMatch(query, /[ áãéíóú:\/]/);
  assert.match(query, /%C3%BA/); // "ú" de anúncio em UTF-8
  assert.equal(query.split('&').length, 2);
});

test('sem caractere quebrado ao decodificar', () => {
  for (const variant of ['comprador', 'visitante'] as const) {
    const text = parse(buildShareUrl({ adId: 'x1', pixels: 100, variant })).searchParams.get('text') ?? '';
    assert.ok(!text.includes('\uFFFD'));
    assert.ok(!/Ã|Â/.test(text));
  }
});

test('id com caractere especial nao injeta parametro', () => {
  const url = parse(buildShareUrl({ adId: 'a&text=x', pixels: 25, variant: 'visitante' }));
  assert.equal(Array.from(url.searchParams.keys()).length, 2);
  assert.equal(url.searchParams.get('url'), `${SITE_URL}/a/a%26text%3Dx`);
});

test('status compartilhaveis', () => {
  for (const s of ['paid', 'published', 'in_review']) assert.ok(SHAREABLE_ORDER_STATUSES.has(s));
  for (const s of ['pending', 'reserved', 'expired', 'refunded']) assert.ok(!SHAREABLE_ORDER_STATUSES.has(s));
});
