/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
    // sharp carrega o binário de @img/* por caminho dinâmico; garante que vá para o standalone
    outputFileTracingIncludes: {
      '/api/orders': ['./node_modules/sharp/**/*', './node_modules/@img/**/*'],
    },
  },
};

export default nextConfig;
