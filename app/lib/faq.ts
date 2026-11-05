import type { FaqItem, FaqPageJsonLd } from '../../types/faq.ts';
import { BLOCK_SIZE, PIXEL_PRICE_BRL, RESERVATION_MINUTES } from './constants.ts';

const MIN_AD_BRL = BLOCK_SIZE * BLOCK_SIZE * PIXEL_PRICE_BRL;

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: 'Quanto custa o menor anúncio?',
    answer: `R$ ${MIN_AD_BRL}. O bloco mínimo é de ${BLOCK_SIZE}x${BLOCK_SIZE} pixels e cada pixel custa R$ ${PIXEL_PRICE_BRL}.`,
  },
  {
    question: 'Posso escolher onde fica?',
    answer: 'Pode. Você escolhe qualquer área livre da grade. Quem chega primeiro pega o centro.',
  },
  {
    question: 'Quanto tempo fica no ar?',
    answer: 'Pra sempre, enquanto o site existir. Não tem mensalidade nem renovação.',
  },
  {
    question: `O que acontece se eu não pagar em ${RESERVATION_MINUTES} min?`,
    answer: `A reserva expira e a área volta a ficar livre para outra pessoa. Nada é cobrado.`,
  },
];

export function buildFaqPageJsonLd(items: readonly FaqItem[]): FaqPageJsonLd {
  if (items.length === 0) throw new Error('FAQPage precisa de pelo menos uma pergunta');
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

// JSON seguro para <script>: escapa "<" para não fechar a tag
export function serializeJsonLd(data: FaqPageJsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
