export interface AdInput {
  title: string;
  linkUrl: string;
  hasImage: boolean;
  acceptedTerms: boolean;
}

export type ModerationStatus = 'approved' | 'rejected' | 'review';

export interface ModerationResult {
  valid: boolean;
  moderationStatus: ModerationStatus;
  fieldErrors: {
    title?: string;
    linkUrl?: string;
    image?: string;
    terms?: string;
  };
  moderationReason?: string;
}

const FORBIDDEN_WORDS: { category: string; reason: string; words: string[] }[] = [
  {
    category: 'adulto',
    reason: 'Conteudo adulto ou sexual nao e permitido',
    words: ['porn', 'porno', 'sexo', 'sexy', 'acompanhante', 'putaria', 'nude', 'nudes', 'xxx', 'erotico', 'onlyfans'],
  },
  {
    category: 'apostas',
    reason: 'Apostas, cassinos ou jogos de azar nao sao permitidos',
    words: ['bet', 'bets', 'cassino', 'casino', 'tigrinho', 'blaze', 'roleta', 'aposta', 'apostas', 'bet365', 'betano'],
  },
  {
    category: 'cripto',
    reason: 'Criptomoedas, NFTs ou promessas de dinheiro facil nao sao permitidos',
    words: ['cripto', 'crypto', 'bitcoin', 'btc', 'ethereum', 'nft', 'token', 'airdrop', 'urubu do pix', 'renda facil', 'piramide'],
  },
  {
    category: 'politica',
    reason: 'Propaganda eleitoral, partidaria ou politica nao e permitida',
    words: ['eleicao', 'eleicoes', 'voto', 'partido', 'candidato', 'bolsonaro', 'lula', 'pt', 'pl', 'campanha eleitoral'],
  },
  {
    category: 'violencia',
    reason: 'Discurso de odio, violencia ou conteudo ilegal nao e permitido',
    words: ['nazis', 'racis', 'odio', 'matar', 'suicidio', 'drogas', 'armas', 'hack', 'crack', 'warez'],
  },
];

const SUSPICIOUS_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'buff.ly', 'cutt.ly', 'rb.gy', 'goo.gl', 'ow.ly', 'shorte.st',
];

const SUSPICIOUS_EXTENSIONS = ['.exe', '.apk', '.bat', '.cmd', '.msi', '.vbs', '.scr', '.zip', '.rar'];

function checkForbiddenText(text: string): string | null {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const group of FORBIDDEN_WORDS) {
    for (const w of group.words) {
      const regex = new RegExp(`\\b${w}\\b`, 'i');
      if (regex.test(normalized)) {
        return group.reason;
      }
    }
  }
  return null;
}

function checkLinkUrl(urlStr: string): { valid: boolean; error?: string } {
  const trimmed = urlStr.trim();
  if (!trimmed) {
    return { valid: false, error: 'O link de destino e obrigatorio' };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Formato de link invalido (use https://...)' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, error: 'O link deve comecar com http:// ou https://' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (SUSPICIOUS_SHORTENERS.some((s) => hostname === s || hostname.endsWith(`.${s}`))) {
    return { valid: false, error: 'Links encurtados nao sao permitidos por seguranca' };
  }

  const pathname = parsed.pathname.toLowerCase();
  if (SUSPICIOUS_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return { valid: false, error: 'Links para download direto de arquivos nao sao permitidos' };
  }

  const forbiddenReason = checkForbiddenText(trimmed);
  if (forbiddenReason) {
    return { valid: false, error: forbiddenReason };
  }

  return { valid: true };
}

export function validateAdInput(input: AdInput): ModerationResult {
  const fieldErrors: ModerationResult['fieldErrors'] = {};
  let moderationReason: string | undefined;

  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    fieldErrors.title = 'O titulo (texto alternativo) e obrigatorio';
  } else if (trimmedTitle.length > 80) {
    fieldErrors.title = 'O titulo deve ter no maximo 80 caracteres';
  } else {
    const forbidden = checkForbiddenText(trimmedTitle);
    if (forbidden) {
      fieldErrors.title = forbidden;
      moderationReason = forbidden;
    }
  }

  const linkCheck = checkLinkUrl(input.linkUrl);
  if (!linkCheck.valid && linkCheck.error) {
    fieldErrors.linkUrl = linkCheck.error;
    if (!moderationReason) moderationReason = linkCheck.error;
  }

  if (!input.hasImage) {
    fieldErrors.image = 'Envie uma imagem para seu bloco de pixels';
  }

  if (!input.acceptedTerms) {
    fieldErrors.terms = 'E necessario aceitar os termos e diretrizes de publicacao';
  }

  const hasErrors = Object.keys(fieldErrors).length > 0;
  const status: ModerationStatus = moderationReason ? 'rejected' : hasErrors ? 'review' : 'approved';

  return {
    valid: !hasErrors,
    moderationStatus: status,
    fieldErrors,
    moderationReason,
  };
}
