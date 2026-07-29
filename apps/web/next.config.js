/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite importar o pacote compartilhado (TypeScript) direto do monorepo
  transpilePackages: ['@pecus/shared'],
};

module.exports = nextConfig;
