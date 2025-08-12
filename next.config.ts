import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Load the locale configuration for next-intl via the plugin so the runtime
// receives the proper `NEXT_INTL_CONFIG` environment variable.
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
