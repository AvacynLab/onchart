/**
 * Minimal type declarations for the `rss-parser` package.
 * The library does not ship with official typings in npm,
 * so this file supplies the small subset used within the app.
 */
declare module 'rss-parser' {
  export interface Item {
    [key: string]: unknown;
  }

  export interface Output<T = Item> {
    items: T[];
  }

  export default class Parser<T = Item, U = Output<T>> {
    parseURL(url: string): Promise<U>;
  }
}
