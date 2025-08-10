import React, { createContext, useContext } from 'react';
import Module from 'module';

// Minimal stub for `next-intl` to allow rendering translation hooks in unit tests
// without loading the full library. It stores provided messages in a React
// context and returns them through `useTranslations`. Missing keys fallback to
// returning the key itself.
const IntlContext = createContext<Record<string, any>>({});

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'next-intl') {
    return {
      IntlProvider: ({ messages, children }: { messages?: any; children: React.ReactNode }) =>
        React.createElement(IntlContext.Provider, { value: messages ?? {} }, children),
      useTranslations: (ns?: string) => {
        const messages = useContext(IntlContext);
        return (key: string) => {
          const path = ns ? `${ns}.${key}` : key;
          return path.split('.').reduce((obj: any, part) => obj?.[part], messages) ?? key;
        };
      },
      useLocale: () => 'en',
    } as any;
  }
  if (request === 'next-intl/server') {
    return {
      getTranslations: async () => (key: string) => key,
    } as any;
  }
  return originalLoad(request, parent, isMain);
};
