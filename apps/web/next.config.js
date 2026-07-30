// script/style inline são necessários: o próprio Next.js injeta scripts inline pra
// hidratação (RSC payload), e o app usa style={{}} do React em várias telas.
// Em dev, o Next também precisa de 'unsafe-eval' pro hot-reload (webpack usa eval
// pra empacotar módulo); em produção isso não existe, então fica de fora — CSP
// mais estrita só no ambiente que os usuários de verdade acessam.
// Ainda assim, frame-ancestors/object-src/base-uri fechados já cobrem clickjacking
// e a maior parte dos vetores de injeção de conteúdo externo.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: CSP },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite importar o pacote compartilhado (TypeScript) direto do monorepo
  transpilePackages: ['@pecus/shared'],
  // Rodar `next build` enquanto um `next dev` está de pé corrompe o .next
  // compartilhado (dá "Cannot find module './xxxx.js'"). Setar NEXT_DIST_DIR
  // permite buildar num diretório separado sem derrubar o dev que está rodando.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

module.exports = nextConfig;
