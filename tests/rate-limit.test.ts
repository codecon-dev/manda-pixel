import test from 'node:test';
import assert from 'node:assert/strict';
import { clientKey, createRateLimiter } from '../app/lib/rate-limit.ts';
import { isValidClientId } from '../app/lib/presence.ts';

test('limit 3: quarta chamada bloqueada, outra chave livre, libera depois da janela', () => {
  const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
  const now = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(limiter.check('a', now).ok, true);
  const blocked = limiter.check('a', now + 10);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSec > 0);
  assert.equal(limiter.check('b', now + 10).ok, true);
  assert.equal(limiter.check('a', now + 60_000).ok, true);
});

test('clientKey: ordem dos headers e corte', () => {
  assert.equal(clientKey(new Headers({ 'x-forwarded-for': 'a, b' })), 'a');
  assert.equal(
    clientKey(new Headers({ 'cf-connecting-ip': 'cf', 'x-real-ip': 'real', 'x-forwarded-for': 'xff' })),
    'cf'
  );
  assert.equal(clientKey(new Headers({ 'x-real-ip': 'real', 'x-forwarded-for': 'xff' })), 'real');
  assert.equal(clientKey(new Headers()), 'unknown');
  assert.equal(clientKey(new Headers({ 'x-forwarded-for': 'z'.repeat(500) })).length, 64);
});

test('10.000 chaves com maxKeys 100: memoria nunca passa de 100', () => {
  const limiter = createRateLimiter({ limit: 5, windowMs: 60_000, maxKeys: 100 });
  for (let i = 0; i < 10_000; i++) {
    limiter.check(`k${i}`, 1_000 + i);
    assert.ok(limiter.size() <= 100);
  }
});

test('isValidClientId recusa valor hostil e aceita formatos do front', () => {
  for (const bad of ['', 'abc', 'a'.repeat(65), '../x', '<script>', 'a b c d e f', null, 42]) {
    assert.equal(isValidClientId(bad), false, String(bad));
  }
  assert.equal(isValidClientId('3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c'), true);
  assert.equal(isValidClientId('mp_k3j9x2abc_lz8q1w2e'), true);
});
