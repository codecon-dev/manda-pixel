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
