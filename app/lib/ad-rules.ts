/** Regra unica de "anuncio no ar": usada no calculo em memoria e no SQL. */

/** Status que deixam o anuncio visivel na grade. */
export const LIVE_STATUSES = ['paid', 'published'] as const;
/** Moderacao exigida para o anuncio estar no ar. */
export const LIVE_MODERATION_STATUS = 'approved';
/** Decisao de moderacao que segura o anuncio fora do ar. */
export const REVIEW_DECISION = 'review';

const LIVE_STATUS_SET: ReadonlySet<string> = new Set(LIVE_STATUSES);

export type LiveCheckRow = {
  status: string;
  moderation_status: string;
  moderation_decision?: string | null;
};

export function isLiveRow(row: LiveCheckRow): boolean {
  return (
    LIVE_STATUS_SET.has(row.status) &&
    row.moderation_status === LIVE_MODERATION_STATUS &&
    row.moderation_decision !== REVIEW_DECISION
  );
}

/** Mesmo criterio de isLiveRow, como clausula WHERE (constantes fixas, sem entrada externa). */
export const LIVE_AD_SQL = `status IN (${LIVE_STATUSES.map((s) => `'${s}'`).join(', ')})
  AND moderation_status = '${LIVE_MODERATION_STATUS}'
  AND COALESCE(moderation_decision, '') != '${REVIEW_DECISION}'`;

/** Id publico de pedido: so minusculas e digitos, ate 64 caracteres. */
export const PUBLIC_AD_ID_PATTERN = /^[a-z0-9]{1,64}$/;

export function isValidPublicAdId(id: string): boolean {
  return PUBLIC_AD_ID_PATTERN.test(id);
}
