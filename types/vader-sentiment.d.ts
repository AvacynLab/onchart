/**
 * Type declarations for the `vader-sentiment` package.
 * The library exports a `SentimentIntensityAnalyzer` with a
 * `polarity_scores` method returning sentiment metrics including
 * a `compound` score.
 */
declare module 'vader-sentiment' {
  export const SentimentIntensityAnalyzer: {
    polarity_scores(text: string): { compound: number };
  };
}
