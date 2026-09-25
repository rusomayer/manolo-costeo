/** @type {import('next').NextConfig} */
const nextConfig = {
  // El linter corre como paso propio (`pnpm lint`), no dentro del build: que un
  // warning de estilo tire abajo un deploy es peor que no tenerlo.
  eslint: { ignoreDuringBuilds: true },
  // Paquetes de la agencia publicados como .ts (sin pre-build). Next.js los
  // compila como código local del workspace.
  transpilePackages: [
    '@rusomayer/anthropic',
    '@rusomayer/integrations',
    '@rusomayer/supabase',
    '@rusomayer/utils',
    '@rusomayer/prompts',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  }
};

module.exports = nextConfig;
