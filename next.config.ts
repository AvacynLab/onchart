import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Load the locale configuration for next-intl via the plugin and point it to
// the shared i18n config so the runtime receives `NEXT_INTL_CONFIG`.
const withNextIntl = createNextIntlPlugin('./i18n/config.ts');

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
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
