import type { ModerationResult } from './moderation';

/** Lista, em ordem fixa, o que ainda falta preencher no painel de compra. */
export function listMissing(
  fieldErrors: ModerationResult['fieldErrors'],
  hasImage: boolean,
): string[] {
  const missing: string[] = [];
  if (!hasImage || fieldErrors.image) missing.push('imagem');
  if (fieldErrors.title) missing.push('título');
  if (fieldErrors.linkUrl) missing.push('link');
  if (fieldErrors.terms) missing.push('aceitar os termos');
  return missing;
}
