import { PRESENCE_TTL_MS } from './constants.ts';

declare global {
  // eslint-disable-next-line no-var
  var __mandapixel_presence: Map<string, number> | undefined;
}

export function getPresenceMap(): Map<string, number> {
  if (!global.__mandapixel_presence) {
    global.__mandapixel_presence = new Map<string, number>();
  }
  return global.__mandapixel_presence;
}

export function cleanExpiredPresence(ttlMs = PRESENCE_TTL_MS): Map<string, number> {
  const map = getPresenceMap();
  const now = Date.now();
  map.forEach((lastSeen, id) => {
    if (now - lastSeen > ttlMs) {
      map.delete(id);
    }
  });
  return map;
}

/** Visitantes com heartbeat nos ultimos PRESENCE_TTL_MS (aproximado, memoria do processo). */
export function getOnlineCount(): number {
  return cleanExpiredPresence().size;
}

// Front gera 'mp_<base36>_<base36>' (PixelCanvas); UUID tambem passa.
const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/** clientId do heartbeat: so letras, numeros, '-' e '_', de 8 a 64 caracteres. */
export function isValidClientId(value: unknown): value is string {
  return typeof value === 'string' && CLIENT_ID_PATTERN.test(value);
}
