import React from 'react';
import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { NextIntlClientProvider } from 'next-intl';
// Messages are loaded manually below; no need for next-intl helpers that
// require a project-level config file.
import { headers } from 'next/headers';
import i18n, { type Locale } from '@/i18n/config';
import { auth } from '@/app/(auth)/auth';
import { getUserSettings } from '@/lib/db/queries';
import localFont from 'next/font/local';
import frCommon from '../messages/fr/common.json' assert { type: 'json' };
import frDashboard from '../messages/fr/dashboard.json' assert { type: 'json' };
import frFinance from '../messages/fr/finance.json' assert { type: 'json' };
import frChat from '../messages/fr/chat.json' assert { type: 'json' };
import enCommon from '../messages/en/common.json' assert { type: 'json' };
import enDashboard from '../messages/en/dashboard.json' assert { type: 'json' };
import enFinance from '../messages/en/finance.json' assert { type: 'json' };
import enChat from '../messages/en/chat.json' assert { type: 'json' };

// Load Geist fonts locally to avoid external network requests (e.g. Google
// Fonts) so builds and tests can run offline. When Playwright sets the
// `PLAYWRIGHT` env variable the class names are omitted and the browser falls
// back to system fonts, but the font loaders must still execute at module scope
// for Next.js to bundle the assets.
const geistSans = localFont({
  src: '../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2',
  weight: '100 900',
  variable: '--font-geist-sans',
  display: 'swap',
});
const geistMono = localFont({
  src: '../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2',
  weight: '100 900',
  variable: '--font-geist-mono',
  display: 'swap',
});

import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { ToolbarProvider } from '@/components/toolbar-store';

export const metadata: Metadata = {
  metadataBase: new URL('https://chat.vercel.ai'),
  title: 'Next.js Chatbot Template',
  description: 'Next.js chatbot template using the AI SDK.',
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

// When running under Playwright we drop the font variables so the rendered HTML
// uses system defaults while still ensuring the font assets are bundled during
// builds. This keeps tests deterministic without network access.
const fontClass = process.env.PLAYWRIGHT
  ? ''
  : `${geistSans.variable} ${geistMono.variable}`;

const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)';
const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)';
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Déterminer la langue : priorité à celle stockée en base pour un
  // utilisateur connecté, sinon lecture du cookie `lang`, puis fallback sur la
  // locale par défaut.
  const headerList = await headers();
  const cookieLocale = headerList
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('lang='))
    ?.split('=')[1] as Locale | undefined;
  // In Playwright tests we skip the NextAuth session lookup to avoid async
  // hooks that can trigger React "suspended thenable" errors when no auth
  // provider is configured.
  const session = process.env.PLAYWRIGHT ? null : await auth();
  let locale: Locale | undefined;
  if (session?.user?.id) {
    const preferred = await getUserSettings(session.user.id);
    if (preferred && i18n.locales.includes(preferred as Locale)) {
      locale = preferred as Locale;
    }
  }
  if (!locale) {
    locale = cookieLocale && i18n.locales.includes(cookieLocale)
      ? cookieLocale
      : i18n.defaultLocale;
  }
  const messages =
    locale === 'en'
      ? {
          common: enCommon,
          dashboard: enDashboard,
          finance: enFinance,
          chat: enChat,
        }
      : {
          common: frCommon,
          dashboard: frDashboard,
          finance: frFinance,
          chat: frChat,
        };
  return (
    <html
      lang={locale}
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      suppressHydrationWarning
      className={fontClass}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Toaster position="top-center" />
            {process.env.PLAYWRIGHT ? (
              // In Playwright test runs we avoid mounting the SessionProvider
              // entirely. NextAuth's client-side session retrieval can trigger
              // React "suspended thenable" errors when no auth providers are
              // configured for the environment. Skipping the provider keeps
              // the component tree simple and allows pages to render without
              // authentication context.
              <ToolbarProvider>{children}</ToolbarProvider>
            ) : (
              <SessionProvider>
                <ToolbarProvider>{children}</ToolbarProvider>
              </SessionProvider>
            )}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
