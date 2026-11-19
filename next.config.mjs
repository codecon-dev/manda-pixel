/**
 * CSP em modo Report-Only: so observa, nao bloqueia nada. Sem report-uri por enquanto.
 * De onde veio cada host:
 * - https://us.i.posthog.com: api_host do posthog.init em app/layout.tsx (eventos, flags).
 * - https://us-assets.i.posthog.com: o snippet em app/layout.tsx troca ".i.posthog.com" por
 *   "-assets.i.posthog.com" para carregar /static/array.js e extensoes.
 * - https://fonts.googleapis.com / https://fonts.gstatic.com: <link> de fonte em app/layout.tsx.
 * - Checkout: BuyPanel redireciona com window.location.href (nao e POST de form), entao form-action fica 'self'.
 * - Imagens: anuncios sao servidos pela propria app (uploads) e canvas usa data:/blob:; nenhum host externo.
 */
const POSTHOG_API = 'https://us.i.posthog.com';
const POSTHOG_ASSETS = 'https://us-assets.i.posthog.com';
const GOOGLE_FONTS_CSS = 'https://fonts.googleapis.com';
const GOOGLE_FONTS_FILES = 'https://fonts.gstatic.com';

const CSP_REPORT_ONLY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${POSTHOG_ASSETS}`,
  `connect-src 'self' ${POSTHOG_API} ${POSTHOG_ASSETS}`,
  "img-src 'self' data: blob:",
  `style-src 'self' 'unsafe-inline' ${GOOGLE_FONTS_CSS}`,
  `font-src 'self' data: ${GOOGLE_FONTS_FILES}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
    // sharp carrega o binário de @img/* por caminho dinâmico; garante que vá para o standalone
    outputFileTracingIncludes: {
      '/api/orders': ['./node_modules/sharp/**/*', './node_modules/@img/**/*'],
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy-Report-Only', value: CSP_REPORT_ONLY },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
