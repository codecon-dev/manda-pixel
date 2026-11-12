// Identificador anonimo do visitante (cookie httpOnly). Sem IP, sem node:*.

export const VISITOR_COOKIE = 'mp_vid';
export const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Valor do cookie normalizado se for UUID v4; senao null. */
export function parseVisitorId(cookieValue: string | null | undefined): string | null {
  if (typeof cookieValue !== 'string') return null;
  const value = cookieValue.trim().toLowerCase();
  return UUID_V4.test(value) ? value : null;
}

export function newVisitorId(): string {
  return crypto.randomUUID();
}

/** Usa o cookie se valido; senao gera um id novo (que nao tem reserva de ninguem). */
export function resolveVisitorId(cookieValue: string | null | undefined): string {
  return parseVisitorId(cookieValue) ?? newVisitorId();
}
