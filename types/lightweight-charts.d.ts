// Minimal type declarations for lightweight-charts to satisfy TypeScript and ESLint.
declare module 'lightweight-charts' {
  export interface IChartApi {
    remove(): void;
    addCandlestickSeries(): ISeriesApi<'Candlestick'>;
  }
  export interface ISeriesApi<T extends string> {
    setData(data: unknown): void;
    update(data: unknown): void;
  }
  export type CandlestickData = Record<string, unknown>;
  export function createChart(container: HTMLElement): IChartApi;
}
