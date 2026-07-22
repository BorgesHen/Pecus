/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite importar o pacote compartilhado (TypeScript) direto do monorepo
  transpilePackages: ['@pecus/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api',
  },
};

module.exports = nextConfig;
