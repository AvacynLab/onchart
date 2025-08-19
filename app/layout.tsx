import React from 'react';
import { Toaster } from 'sonner';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import localFont from 'next/font/local';

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
import { AssetProvider } from '@/lib/asset/AssetContext';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { cookies } from 'next/headers';

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
  // Resolve the active locale and its message bundles using the configuration
  // in `i18n/request.ts`. This ensures that the language chosen by the
  // middleware (cookie, database or Accept-Language) is honoured consistently
  // for both server and client components.
  const locale = await getLocale();
  const messages = await getMessages();
  const cookieStore = await cookies();
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';
  const content = <AssetProvider>{children}</AssetProvider>;
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
      <body className="h-dvh overflow-hidden antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Toaster position="top-center" />
            {process.env.PLAYWRIGHT ? (
              // During Playwright runs we skip authentication providers to keep
              // the component tree shallow and deterministic.
              <ToolbarProvider>
                <SidebarProvider defaultOpen={!isCollapsed}>
                  <AppSidebar user={undefined} />
                  <SidebarInset>{content}</SidebarInset>
                </SidebarProvider>
              </ToolbarProvider>
            ) : (
              <SessionProvider>
                <ToolbarProvider>
                  <SidebarProvider defaultOpen={!isCollapsed}>
                    <AppSidebar user={undefined} />
                    <SidebarInset>{content}</SidebarInset>
                  </SidebarProvider>
                </ToolbarProvider>
              </SessionProvider>
            )}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
