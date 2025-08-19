import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Instruct next-intl's plugin to load the request configuration from the
// `i18n/request.ts` module so the development server and build pipeline can
// resolve locales for each request.
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Disable Partial Pre-rendering during Playwright runs to avoid
// `clientModules` hydration errors in the production build used for tests.
const isPlaywright = Boolean(process.env.PLAYWRIGHT);

const nextConfig: NextConfig = {
  experimental: {
    ppr: !isPlaywright,
    // Individual segments may override this via `export const experimental_ppr`.
    // Leave those off while E2E tests remain incompatible with PPR.
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
