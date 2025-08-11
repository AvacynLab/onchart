import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { NextIntlClientProvider } from 'next-intl';
// Messages are loaded manually below; no need for next-intl helpers that
// require a project-level config file.
import { headers } from 'next/headers';
import { i18n, type Locale } from '@/i18n/config';

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

// Load Google fonts at module scope as required by `next/font`. During
// Playwright runs we skip contacting Google servers and fall back to system
// fonts by returning empty classnames.
const isPlaywright = process.env.PLAYWRIGHT === '1';
const geist = isPlaywright
  ? { className: '', variable: '' }
  : Geist({
      subsets: ['latin'],
      display: 'swap',
      variable: '--font-geist',
    });

const geistMono = isPlaywright
  ? { className: '', variable: '' }
  : Geist_Mono({
      subsets: ['latin'],
      display: 'swap',
      variable: '--font-geist-mono',
    });

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
  const headerLocale = (await headers()).get('x-next-intl-locale');
  const locale: Locale = i18n.locales.includes(headerLocale as Locale)
    ? (headerLocale as Locale)
    : i18n.defaultLocale;
  // Gather all namespaces for the resolved locale so translations are available.
  const messages = {
    ...(await import(`../messages/${locale}/common.json`)).default,
    ...(await import(`../messages/${locale}/dashboard.json`)).default,
    ...(await import(`../messages/${locale}/finance.json`)).default,
  };

  return (
    <html
      lang={locale}
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable}`}
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
            <SessionProvider>
              <ToolbarProvider>{children}</ToolbarProvider>
            </SessionProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
