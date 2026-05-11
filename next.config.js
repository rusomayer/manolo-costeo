/** @type {import('next').NextConfig} */
const nextConfig = {
  // Paquetes de la agencia publicados como .ts (sin pre-build). Next.js los
  // compila como código local del workspace.
  transpilePackages: [
    '@rusomayer/anthropic',
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
