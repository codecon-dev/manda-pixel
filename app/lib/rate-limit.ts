import { CLIENT_KEY_MAX_LENGTH, RATE_LIMIT_MAX_KEYS } from './constants.ts';

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  maxKeys?: number;
}

export interface RateLimiter {
  check(key: string, now?: number): RateLimitResult;
  /** So para teste: quantas chaves estao na memoria. */
  size(): number;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

/**
 * Chave de cota do cliente a partir dos headers do proxy.
 * E chave de cota, nunca permissao: header e texto que o cliente pode forjar.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  const key =
    headers.get('cf-connecting-ip')?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    (forwarded ? forwarded.split(',')[0].trim() : '') ||
    'unknown';
  return key.slice(0, CLIENT_KEY_MAX_LENGTH);
}

function evict(map: Map<string, WindowEntry>, maxKeys: number, now: number): void {
  if (map.size <= maxKeys) return;
  map.forEach((entry, key) => {
    if (entry.resetAt <= now) map.delete(key);
  });
  const oldestFirst = Array.from(map.keys());
  for (let i = 0; map.size > maxKeys && i < oldestFirst.length; i++) {
    map.delete(oldestFirst[i]);
  }
}

/** Janela fixa por chave, so em memoria (nada vai para disco nem log). */
export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = RATE_LIMIT_MAX_KEYS,
}: RateLimiterOptions): RateLimiter {
  const windows = new Map<string, WindowEntry>();

  function check(key: string, now: number = Date.now()): RateLimitResult {
    let entry = windows.get(key);
    if (!entry || entry.resetAt <= now) {
      windows.delete(key);
      entry = { count: 0, resetAt: now + windowMs };
      windows.set(key, entry);
    }
    evict(windows, maxKeys, now);
    entry.count += 1;
    if (entry.count > limit) {
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
    }
    return { ok: true, retryAfterSec: 0 };
  }

  return { check, size: () => windows.size };
}
