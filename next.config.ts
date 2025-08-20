import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Instruct next-intl's plugin to load the request configuration from the
// `i18n/request.ts` module so the development server and build pipeline can
// resolve locales for each request.
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Stable configuration for tests and production.
const nextConfig: NextConfig = {
  experimental: {
    // Disable unstable features that have caused flakiness in CI.
    ppr: false,
    reactCompiler: false,
    serverSourceMaps: false,
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
