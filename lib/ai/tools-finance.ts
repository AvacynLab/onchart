import { tool } from 'ai';
import { z } from 'zod';
import { fetchQuoteYahoo, fetchOHLCYahoo } from '../finance/sources/yahoo';
import { searchYahoo } from '../finance/search';
import {
  fetchCompanyFacts,
  listFilings as secListFilings,
  searchCompanyCIK,
} from '../finance/sources/sec';
import fetchRssFeeds from '../finance/sources/news';
import { sma, ema, rsi } from '../finance/indicators';
import {
  maCrossover,
  rsiReversion,
  breakoutBB,
  type Signal,
} from '../finance/strategies';
import { backtest as runBacktest } from '../finance/backtest';
import {
  annualizedVolatility,
  maxDrawdown,
  sharpeRatio,
  sortinoRatio,
  beta,
} from '../finance/risk';
import { emitUIEvent } from '../ui/events';
import { nanoid } from 'nanoid';

/**
 * Context passed to each finance tool in order to persist analyses
 * for a given user and chat session.
 */
export interface FinanceToolContext {
  /** Identifier of the user invoking the tool */
  userId: string;
  /** Identifier of the chat associated with the analysis */
  chatId: string;
  /** Locale of the user interface (e.g. 'fr' or 'en') */
  locale?: 'fr' | 'en';
}

/**
 * Dependencies that can be overridden for testing purposes.
 */
type PersistFn = (record: {
  userId: string;
  chatId: string;
  type: string;
  input: unknown;
  output: unknown;
}) => Promise<void>;

interface FinanceDeps {
  fetchQuote?: typeof fetchQuoteYahoo;
  fetchOHLC?: typeof fetchOHLCYahoo;
  search?: typeof searchYahoo;
  searchCIK?: typeof searchCompanyCIK;
  fetchFundamentals?: typeof fetchCompanyFacts;
  listFilings?: typeof secListFilings;
  fetchNews?: typeof fetchRssFeeds;
  saveAttentionMarker?: (args: {
    userId: string;
    chatId: string;
    symbol: string;
    timeframe: string;
    payload: unknown;
  }) => Promise<string>;
  deleteAttentionMarker?: (args: { id: string }) => Promise<void>;
  createResearch?: (args: {
    userId: string;
    chatId: string;
    kind: string;
    title: string;
    sections: any[];
  }) => Promise<any>;
  updateResearch?: (args: {
    id: string;
    title?: string;
    sections?: any[];
  }) => Promise<any>;
  getResearchById?: (args: { id: string }) => Promise<any>;
  persist?: PersistFn;
  createStrategy?: (args: {
    userId: string;
    chatId: string;
    title: string;
    universe?: unknown;
    constraints?: unknown;
    status?: string;
  }) => Promise<any>;
  listStrategiesByChat?: (args: {
    chatId: string;
    cursor?: Date;
    limit?: number;
  }) => Promise<{ items: any[]; nextCursor: Date | null }>;
  getStrategyById?: (args: { id: string }) => Promise<any>;
  createStrategyVersion?: (args: {
    strategyId: string;
    description?: string;
    rules: unknown;
    params: unknown;
    notes?: string;
  }) => Promise<any>;
  getStrategyVersion?: (args: { id: string }) => Promise<any>;
  saveBacktest?: (args: {
    strategyVersionId: string;
    symbolSet: unknown;
    window: unknown;
    metrics: unknown;
    equityCurve: unknown;
    assumptions: unknown;
  }) => Promise<any>;
  updateStrategyStatus?: (args: { id: string; status: string }) => Promise<any>;
}

/**
 * Create a collection of finance related tools.
 * Each tool validates its inputs with zod and persists the produced
 * output using `saveAnalysis` so that future conversations can reuse it.
 */
export function createFinanceTools(
  ctx: FinanceToolContext,
  deps: FinanceDeps = {},
) {
  // Default to French if no locale is provided
  const locale = ctx.locale ?? 'fr';
  const {
    fetchQuote = fetchQuoteYahoo,
    fetchOHLC = fetchOHLCYahoo,
    search = searchYahoo,
    searchCIK = searchCompanyCIK,
    fetchFundamentals = fetchCompanyFacts,
    listFilings = secListFilings,
    fetchNews = fetchRssFeeds,
  } = deps;
  let persist = deps.persist;
  let saveAttention = deps.saveAttentionMarker;
  let deleteAttention = deps.deleteAttentionMarker;
  let createResearchFn = deps.createResearch;
  let updateResearchFn = deps.updateResearch;
  let getResearchFn = deps.getResearchById;
  let createStrategyFn = deps.createStrategy;
  let listStrategiesFn = deps.listStrategiesByChat;
  let getStrategyFn = deps.getStrategyById;
  let createStrategyVersionFn = deps.createStrategyVersion;
  let getStrategyVersionFn = deps.getStrategyVersion;
  let saveBacktestFn = deps.saveBacktest;
  let updateStrategyStatusFn = deps.updateStrategyStatus;

  /** Helper to persist an analysis record */
  async function persistAnalysis(
    type: string,
    input: unknown,
    output: unknown,
  ) {
    try {
      if (!persist) {
        const mod = await import('../db/queries');
        persist = mod.saveAnalysis as PersistFn;
      }
      await persist({
        userId: ctx.userId,
        chatId: ctx.chatId,
        type,
        input,
        output,
      });
    } catch {
      // Persistence failures should not break the tool execution.
    }
  }

  // Group core market data helpers under a dedicated `finance` namespace so
  // the chat route can expose them with a `finance.` prefix.
  const finance = {
    /**
     * Retrieve the latest market quote for a symbol.
     */
    get_quote: tool({
      description: 'Fetch the latest quote for a financial symbol',
      inputSchema: z.object({ symbol: z.string() }),
      execute: async ({ symbol }) => {
        const quote = await fetchQuote(symbol);
        await persistAnalysis('quote', { symbol }, quote);
        return quote;
      },
    }),

    /**
     * Fetch OHLC candles for a symbol and timeframe. Range is passed directly
     * to Yahoo Finance and may be values such as `1d`, `5d`, `1mo`, etc.
     */
    get_ohlc: tool({
      description: 'Fetch OHLC candles for a symbol and timeframe',
      inputSchema: z.object({
        symbol: z.string(),
        timeframe: z.string(),
        range: z.string().optional(),
        start: z.number().optional(),
        end: z.number().optional(),
      }),
      execute: async ({ symbol, timeframe, range, start, end }) => {
        const candles = await fetchOHLC(symbol, timeframe, { range, start, end });
        await persistAnalysis(
          'ohlc',
          { symbol, timeframe, range, start, end },
          candles,
        );
        return candles;
      },
    }),

    /**
     * Search for matching symbols using Yahoo Finance's public API.
     */
    search_symbol: tool({
      description: 'Search financial symbols by keyword',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const results = await search(query);
        await persistAnalysis('search', { query }, results);
        return results;
      },
    }),

    /**
     * Retrieve key fundamental metrics from the SEC companyfacts API.
     * A ticker symbol is resolved to its CIK before requesting data.
     */
    get_fundamentals: tool({
      description: 'Fetch fundamental metrics for a company using SEC data',
      inputSchema: z
        .object({ ticker: z.string().optional(), cik: z.string().optional() })
        .refine((v) => v.ticker || v.cik, {
          message: 'ticker or cik required',
        }),
      execute: async ({ ticker, cik }) => {
        let cikVal = cik;
        if (!cikVal && ticker) {
          const matches = await searchCIK(ticker);
          cikVal = matches[0]?.cik;
        }
        if (!cikVal) throw new Error('CIK not found');
        const facts = await fetchFundamentals(cikVal);
        const ratios: Record<string, number> = {};
        if (facts.assets && facts.liabilities) {
          ratios.debtToAssets = facts.liabilities / facts.assets;
        }
        const out = { cik: cikVal, ...facts, ...ratios };
        await persistAnalysis('fundamentals', { ticker, cik: cikVal }, out);
        return out;
      },
    }),

    /**
     * List recent SEC filings for a company filtered by form types.
     */
    get_filings: tool({
      description: 'List SEC filings for a company',
      inputSchema: z
        .object({
          ticker: z.string().optional(),
          cik: z.string().optional(),
          forms: z.array(z.string()).default(['10-K', '10-Q', '8-K']),
        })
        .refine((v) => v.ticker || v.cik, {
          message: 'ticker or cik required',
        }),
      execute: async ({ ticker, cik, forms }) => {
        let cikVal = cik;
        if (!cikVal && ticker) {
          const matches = await searchCIK(ticker);
          cikVal = matches[0]?.cik;
        }
        if (!cikVal) throw new Error('CIK not found');
        const filings = await listFilings(cikVal, forms);
        await persistAnalysis('filings', { ticker, cik: cikVal, forms }, filings);
        return filings;
      },
    }),

    /**
     * Compute a small set of technical indicators on closing prices.
     * Indicators are specified by name and computed using default periods:
     * SMA/EMA 20, RSI 14. Additional indicators can be added later.
     */
    compute_indicators: tool({
      description: 'Compute basic technical indicators for closing prices',
      inputSchema: z.object({
        prices: z.array(z.number()).min(1),
        list: z.array(z.enum(['sma', 'ema', 'rsi'])),
      }),
      execute: async ({ prices, list }) => {
        const out: Record<string, number[]> = {};
        if (list.includes('sma')) out.sma = sma(prices, 20);
        if (list.includes('ema')) out.ema = ema(prices, 20);
        if (list.includes('rsi')) out.rsi = rsi(prices, 14);
        await persistAnalysis('indicators', { list }, out);
        return out;
      },
    }),

    /**
     * Compute standard risk metrics from a series of prices.
     */
    compute_risk: tool({
      description: 'Compute risk metrics such as volatility and drawdown',
      inputSchema: z.object({
        prices: z.array(z.number()).min(2),
        benchmark: z.array(z.number()).optional(),
        riskFreeRate: z.number().optional(),
      }),
      execute: async ({ prices, benchmark, riskFreeRate }) => {
        const metrics: Record<string, number> = {
          volatility: annualizedVolatility(prices),
          maxDrawdown: maxDrawdown(prices),
          sharpe: sharpeRatio(prices, riskFreeRate),
          sortino: sortinoRatio(prices, riskFreeRate),
        };
        if (benchmark) metrics.beta = beta(prices, benchmark);
        await persistAnalysis('risk', { benchmark }, metrics);
        return metrics;
      },
    }),

    /**
     * Aggregate public RSS feeds (Yahoo, Reuters, Nasdaq) for recent news.
     */
    news: tool({
      description: 'Fetch recent finance news items for a symbol or query',
      inputSchema: z
        .object({
          symbol: z.string().optional(),
          query: z.string().optional(),
          window: z.number().optional(),
        })
        .refine((v) => v.symbol || v.query, {
          message: 'symbol or query required',
        }),
      execute: async ({ symbol, query, window }) => {
        const term = symbol || query || '';
        const items = await fetchNews(term, window);
        await persistAnalysis('news', { term, window }, items);
        return items;
      },
    }),
  };

  return {
    finance,
    ui: {
      /**
       * Request the client to display a chart for a given symbol.
       * The chart parameters are forwarded as part of the UI event.
       */
      show_chart: tool({
        description: 'Display a chart for a symbol on the client',
        inputSchema: z.object({
          symbol: z.string(),
          timeframe: z.string(),
          range: z.string().optional(),
          overlays: z.array(z.string()).optional(),
          studies: z.array(z.string()).optional(),
        }),
        execute: async (params) => {
          emitUIEvent({ type: 'show_chart', payload: params });
          await persistAnalysis('show_chart', params, { ok: true });
          return { ok: true };
        },
      }),

      /**
       * Add an annotation marker on the client chart and persist it server side.
       */
      add_annotation: tool({
        description: 'Add a chart annotation at a specific time',
        inputSchema: z.object({
          symbol: z.string(),
          timeframe: z.string(),
          at: z.number(),
          type: z.string(),
          text: z.string(),
        }),
        execute: async ({ symbol, timeframe, at, type, text }) => {
          if (!saveAttention) {
            const mod = await import('../db/queries');
            saveAttention = mod.saveAttentionMarker;
          }
          const id = await saveAttention({
            userId: ctx.userId,
            chatId: ctx.chatId,
            symbol,
            timeframe,
            payload: { at, type, text },
          });
          const payload = { id, symbol, timeframe, at, type, text };
          emitUIEvent({ type: 'add_annotation', payload });
          await persistAnalysis('add_annotation', { symbol, timeframe, at, type }, { id });
          return { id };
        },
      }),

      /**
       * Remove a previously added annotation by its identifier.
       */
      remove_annotation: tool({
        description: 'Remove a chart annotation by id',
        inputSchema: z.object({ id: z.string() }),
        execute: async ({ id }) => {
          if (!deleteAttention) {
            const mod = await import('../db/queries');
            deleteAttention = mod.deleteAttentionMarker;
          }
          await deleteAttention({ id });
          emitUIEvent({ type: 'remove_annotation', payload: { id } });
          await persistAnalysis('remove_annotation', { id }, { ok: true });
          return { ok: true };
        },
      }),

      /**
       * Highlight a focus area on the chart.
       */
      focus_area: tool({
        description: 'Highlight a time range on the chart',
        inputSchema: z.object({
          symbol: z.string(),
          timeframe: z.string(),
          start: z.number(),
          end: z.number(),
          reason: z.string().optional(),
        }),
        execute: async (params) => {
          emitUIEvent({ type: 'focus_area', payload: params });
          await persistAnalysis('focus_area', params, { ok: true });
          return { ok: true };
        },
      }),
    },

    strategy: {
      /**
       * Start a strategy definition wizard by returning key questions
       * the assistant should ask the user.
       */
      start_wizard: tool({
        description: 'List questions to gather strategy requirements',
        inputSchema: z.object({}).optional(),
        execute: async () => {
          const questions =
            locale === 'fr'
              ? [
                  { key: 'horizon', question: 'Quel est votre horizon de placement ?' },
                  { key: 'risk', question: 'Quel niveau de risque tolérez-vous ?' },
                  {
                    key: 'universe',
                    question: "Sur quels actifs souhaitez-vous vous concentrer ?",
                  },
                  {
                    key: 'frequency',
                    question: 'À quelle fréquence souhaitez-vous trader ?',
                  },
                  {
                    key: 'costs',
                    question: 'Quels frais et slippage souhaitez-vous modéliser ?',
                  },
                  { key: 'esg', question: 'Avez-vous des restrictions ESG ?' },
                  {
                    key: 'maxDrawdown',
                    question: 'Quel drawdown maximum est acceptable ?',
                  },
                ]
              : [
                  { key: 'horizon', question: 'What is your investment horizon?' },
                  {
                    key: 'risk',
                    question: 'What level of risk can you tolerate?',
                  },
                  {
                    key: 'universe',
                    question: 'Which assets do you want to focus on?',
                  },
                  {
                    key: 'frequency',
                    question: 'How frequently do you want to trade?',
                  },
                  {
                    key: 'costs',
                    question: 'What fees and slippage should be modeled?',
                  },
                  { key: 'esg', question: 'Do you have any ESG restrictions?' },
                  {
                    key: 'maxDrawdown',
                    question: 'What maximum drawdown is acceptable?',
                  },
                ];
          await persistAnalysis('strategy_start_wizard', {}, questions);
          return questions;
        },
      }),

      /**
       * Propose an initial rule set for a strategy and persist it.
       */
      propose: tool({
        description:
          locale === 'fr'
            ? 'Propose une stratégie initiale à partir des réponses du questionnaire'
            : 'Propose a strategy from questionnaire answers',
        inputSchema: z
          .object({
            title: z.string(),
            answers: z.record(z.any()),
            universe: z.any().optional(),
            constraints: z.any().optional(),
          })
          .strict(),
        execute: async ({ title, answers, universe = {}, constraints = {} }) => {
          if (!createStrategyFn) {
            const mod = await import('../db/queries');
            // Cast the query helpers to the looser dependency signatures used in
            // the tool layer so TypeScript doesn't require optional fields like
            // `universe` and `constraints` to be provided by every caller.
            createStrategyFn = mod.createStrategy as any;
            createStrategyVersionFn = mod.createStrategyVersion as any;
          }
          // At this point the strategy helpers are guaranteed to be loaded
          // thanks to the dynamic import above, so we can safely assert the
          // factory functions are defined.
          const strat = await createStrategyFn?.({
            userId: ctx.userId,
            chatId: ctx.chatId,
            title,
            universe,
            constraints,
            status: 'draft',
          });
          // Very naive rule proposal: moving average crossover with fixed params.
          const rules = { type: 'ma_crossover', params: { short: 50, long: 200 } };
          const version = await createStrategyVersionFn?.({
            strategyId: strat.id,
            description:
              locale === 'fr' ? 'Proposition initiale' : 'Initial proposal',
            rules,
            params: rules.params,
          });
          const output = { strategy: strat, version };
          await persistAnalysis(
            'strategy_propose',
            { title, answers, universe, constraints },
            output,
          );
          return output;
        },
      }),

      /** List strategies for a given chat. */
      list: tool({
        description:
          locale === 'fr'
            ? "Lister les stratégies d'un chat"
            : 'List strategies for a chat',
        inputSchema: z
          .object({
            chatId: z.string().optional(),
            cursor: z.string().optional(),
            limit: z.number().int().positive().optional(),
          })
          .strict()
          .optional(),
        execute: async ({ chatId, cursor, limit } = {}) => {
          if (!listStrategiesFn) {
            const mod = await import('../db/queries');
            listStrategiesFn = mod.listStrategiesByChat;
          }
          const output = await listStrategiesFn({
            chatId: chatId ?? ctx.chatId,
            cursor: cursor ? new Date(cursor) : undefined,
            limit,
          });
          await persistAnalysis('strategy_list', { chatId, cursor, limit }, output);
          return output;
        },
      }),

      /** Fetch a strategy by its identifier. */
      get: tool({
        description:
          locale === 'fr'
            ? 'Récupérer une stratégie par identifiant'
            : 'Fetch a strategy by id',
        inputSchema: z.object({ id: z.string() }).strict(),
        execute: async ({ id }) => {
          if (!getStrategyFn) {
            const mod = await import('../db/queries');
            getStrategyFn = mod.getStrategyById;
          }
          const output = await getStrategyFn({ id });
          await persistAnalysis('strategy_get', { id }, output);
          return output;
        },
      }),

      /**
       * Run a backtest for a strategy version across one or more symbols.
       */
      backtest: tool({
        description:
          locale === 'fr'
            ? 'Backtester une version de stratégie'
            : 'Backtest a strategy version',
        inputSchema: z
          .object({
            versionId: z.string(),
            symbols: z.array(z.string()),
            timeframe: z.string(),
            range: z.string().optional(),
            costs: z.number().nonnegative().default(0),
            slippage: z.number().nonnegative().default(0),
          })
          .strict(),
        execute: async ({
          versionId,
          symbols,
          timeframe,
          range,
          costs,
          slippage,
        }) => {
          if (!getStrategyVersionFn || !saveBacktestFn) {
            const mod = await import('../db/queries');
            getStrategyVersionFn = mod.getStrategyVersion as any;
            saveBacktestFn = mod.saveBacktest as any;
          }
          const version = await getStrategyVersionFn?.({ id: versionId });
          if (!version) throw new Error('strategy version not found');
          const symbol = symbols[0];
          const candles = await fetchOHLC(symbol, timeframe, { range });
          const closes = candles.map((c: any) => c.close);
          // Trading signals produced by selected strategy rule set.
          let signals: Signal[];
          switch (version.rules?.type) {
            case 'rsi_reversion':
              signals = rsiReversion(closes, version.rules.params?.period, version.rules.params?.oversold, version.rules.params?.overbought).signals;
              break;
            case 'breakout_bb':
              signals = breakoutBB(closes, version.rules.params?.period, version.rules.params?.multiplier).signals;
              break;
            default:
              signals = maCrossover(closes, version.rules.params?.short, version.rules.params?.long).signals;
          }
          const signalMap: Record<number, 'enter' | 'exit'> = {};
          for (const s of signals) signalMap[s.index] = s.type;
          const bt = runBacktest({
            candles,
            signals: signalMap,
            costs,
            slippage,
          });
          await saveBacktestFn?.({
            strategyVersionId: versionId,
            symbolSet: symbols,
            window: { timeframe, range },
            metrics: bt.metrics,
            equityCurve: bt.equityCurve,
            assumptions: { costs, slippage },
          });
          await persistAnalysis(
            'strategy_backtest',
            { versionId, symbols, timeframe, range, costs, slippage },
            bt,
          );
          return bt;
        },
      }),

      /**
       * Create a refined version of an existing strategy based on feedback.
       */
      refine: tool({
        description:
          locale === 'fr'
            ? 'Créer une nouvelle version en incorporant le feedback'
            : 'Create a new version incorporating feedback',
        inputSchema: z
          .object({
            versionId: z.string(),
            feedback: z.string(),
          })
          .strict(),
          execute: async ({ versionId, feedback }) => {
            if (!getStrategyVersionFn || !createStrategyVersionFn) {
              const mod = await import('../db/queries');
              getStrategyVersionFn = mod.getStrategyVersion as any;
              createStrategyVersionFn = mod.createStrategyVersion as any;
            }
            const prev = await getStrategyVersionFn?.({ id: versionId });
            if (!prev) throw new Error('strategy version not found');
            const next = await createStrategyVersionFn?.({
              strategyId: prev.strategyId,
              description: prev.description,
              rules: prev.rules,
              params: prev.params,
              notes: feedback,
            });
          await persistAnalysis('strategy_refine', { versionId, feedback }, next);
          return next;
        },
      }),

      /** Finalize a strategy by marking it as validated. */
      finalize: tool({
        description:
          locale === 'fr'
            ? 'Marquer la stratégie comme validée'
            : 'Mark the strategy as validated',
        inputSchema: z.object({ versionId: z.string() }).strict(),
        execute: async ({ versionId }) => {
          if (
            !getStrategyVersionFn ||
            !updateStrategyStatusFn
          ) {
            const mod = await import('../db/queries');
            getStrategyVersionFn = mod.getStrategyVersion;
            // Cast to a looser signature so callers can supply plain strings
            // without satisfying the narrower union expected by the DB layer.
            updateStrategyStatusFn = mod.updateStrategyStatus as any;
          }
          const version = await getStrategyVersionFn?.({ id: versionId });
          if (!version) throw new Error('strategy version not found');
          const strat = await updateStrategyStatusFn?.({
            id: version.strategyId,
            status: 'validated',
          });
          await persistAnalysis('strategy_finalize', { versionId }, strat);
          return strat;
        },
      }),
    },

    research: {
      /**
       * Create a new research document with optional initial sections.
       */
      create: tool({
        description: 'Create a new research document',
        inputSchema: z.object({
          kind: z.string(),
          title: z.string(),
          sections: z.array(z.any()).default([]),
        }),
        execute: async ({ kind, title, sections }) => {
          if (!createResearchFn) {
            const mod = await import('../db/queries');
            // Cast the query helper to a loose type so callers can pass
            // simplified inputs while the database layer enforces strict
            // validation.
            createResearchFn = mod.createResearch as any;
          }
          const doc = await createResearchFn?.({
            userId: ctx.userId,
            chatId: ctx.chatId,
            kind,
            title,
            // Default to an empty section list if none provided so the
            // DB helper receives a concrete array.
            sections: sections ?? [],
          });
          // Log the creation so the dashboard can surface the new research
          // document in "Mes analyses".
          await persistAnalysis('research_create', { kind, title }, doc);
          return doc;
        },
      }),

      /**
       * Append a section to an existing research document.
       */
      add_section: tool({
        description: 'Append a section to a research document',
        inputSchema: z.object({
          id: z.string(),
          section: z.object({
            title: z.string().optional(),
            content: z.string(),
          }),
        }),
        execute: async ({ id, section }) => {
          if (!getResearchFn || !updateResearchFn) {
            const mod = await import('../db/queries');
            getResearchFn = mod.getResearchById as any;
            updateResearchFn = mod.updateResearch as any;
          }
          const doc = await getResearchFn?.({ id });
          const newSection = { id: nanoid(), ...section };
          const updated = await updateResearchFn?.({
            id,
            sections: [...(doc.sections || []), newSection],
          });
          // Persist the modification to keep an audit trail of research edits.
          await persistAnalysis(
            'research_add_section',
            { id, section: newSection },
            updated,
          );
          return updated;
        },
      }),

      /**
       * Update the content of an existing research section.
       */
      update_section: tool({
        description: 'Update a section within a research document',
        inputSchema: z.object({
          id: z.string(),
          sectionId: z.string(),
          content: z.string(),
        }),
        execute: async ({ id, sectionId, content }) => {
          if (!getResearchFn || !updateResearchFn) {
            const mod = await import('../db/queries');
            getResearchFn = mod.getResearchById as any;
            updateResearchFn = mod.updateResearch as any;
          }
          const doc = await getResearchFn?.({ id });
          const sections = (doc.sections || []).map((s: any) =>
            s.id === sectionId ? { ...s, content } : s,
          );
          const updated = await updateResearchFn?.({ id, sections });
          // Record the update so user-facing lists reflect the latest content.
          await persistAnalysis(
            'research_update_section',
            { id, sectionId },
            updated,
          );
          return updated;
        },
      }),

      /**
       * Finalize a research document and persist it as an analysis artifact.
       */
      finalize: tool({
        description: 'Finalize a research document',
        inputSchema: z.object({ id: z.string() }),
        execute: async ({ id }) => {
          if (!getResearchFn) {
            const mod = await import('../db/queries');
            getResearchFn = mod.getResearchById as any;
          }
          const doc = await getResearchFn?.({ id });
          await persistAnalysis('doc', { id }, doc);
          return doc;
        },
      }),

      /**
       * Retrieve a research document by its identifier.
       */
      get: tool({
        description: 'Fetch a research document by id',
        inputSchema: z.object({ id: z.string() }),
        execute: async ({ id }) => {
          if (!getResearchFn) {
            const mod = await import('../db/queries');
            getResearchFn = mod.getResearchById as any;
          }
          const doc = await getResearchFn?.({ id });
          await persistAnalysis('research_get', { id }, doc);
          return doc;
        },
      }),
    },
  };
}

export type FinanceTools = ReturnType<typeof createFinanceTools>;
