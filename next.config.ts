import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Load the locale configuration for next-intl via the plugin and point it to
// the shared root config so the runtime receives `NEXT_INTL_CONFIG`.
const withNextIntl = createNextIntlPlugin('./next-intl.config.ts');

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
    // Providing an empty `turbo` object ensures the next-intl plugin injects
    // its alias under `experimental.turbo` instead of the deprecated
    // top-level `turbopack` key, avoiding "unrecognized option" warnings in
    // Next.js 15.
    turbo: {},
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
