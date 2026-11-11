// Hash diario do IP (so servidor). O IP em texto nunca e guardado.
import { createHash } from 'node:crypto';

const IP_HASH_SALT = 'mandapixel:pending-per-ip:v1';

/** sha256(salt + AAAA-MM-DD + ip). null se o ip estiver vazio (regra do pendente nao se aplica). */
export function hashIp(ip: string, day: Date = new Date()): string | null {
  const trimmed = ip.trim();
  if (!trimmed) return null;
  const dayKey = day.toISOString().slice(0, 10);
  return createHash('sha256').update(IP_HASH_SALT + dayKey + trimmed).digest('hex');
}
