Parfait. Voici la **checklist complète, hiérarchisée et cochable** pour qu’un **agent IA** applique **tous** les points pertinents (y compris les petites améliorations) sur la **version actuelle**.
Tout est **fichier par fichier**, avec **sous-étapes** et **objectifs/critères d’acceptation**, en restant strictement sur **données publiques/scrapers maison** (Yahoo/Stooq/Binance publics, SEC/EDGAR, RSS).

---

# 0) Préambule — cadre & done-defs

* [x] Éviter toute dépendance requérant une clé API.
  **Objectif** : seulement `fetch` public + parsing (`cheerio`), flux RSS, CSV publics, WS publics Binance.
* [ ] **Done-defs globaux**

  * [x] `pnpm build` et **tous** les tests passent.
  * [x] UI **FR/EN** fonctionnelle (détection locale + switch).
  * [x] “Menu” = **tuile Bento** (pas overlay).
  * [x] `strategy.*` **exposé** dans `tools:` et listé dans `experimental_activeTools`.

---

# 1) Route chat — exposition complète des tools

**Fichier** : `app/(chat)/api/chat/route.ts`
**But** : exposer **finance.***, **ui.***, **research.***, **strategy.*** avec noms préfixés + filtrage.

* [x] Déstructurer les toolsets

  * [x] Ajouter/Confirmer `strategy: strategyTools` dans
    `const { ui: uiTools, research: researchTools, strategy: strategyTools, ...finance } = ft;`
* [x] Mapper les tools dans la map finale

  * [x] `...prefixTools('finance', finance as Record<string, Tool>)`
  * [x] `...prefixTools('ui', uiTools as Record<string, Tool>)`
  * [x] `...prefixTools('research', researchTools as Record<string, Tool>)`
  * [x] `...prefixTools('strategy', strategyTools as Record<string, Tool>)`
* [x] Activer le filtrage (si utilisé)

  * [x] `experimental_activeTools: Object.keys(financeToolMap)`
* **Critères d’acceptation** : appels réussis à `strategy.start_wizard`, `strategy.backtest`, `strategy.refine` via chat.

---

# 2) Routes Finance — exécution Node.js (scraping)

**Fichiers** :
`app/(chat)/api/finance/quote/route.ts`
`app/(chat)/api/finance/ohlc/route.ts`
`app/(chat)/api/finance/fundamentals/route.ts`
`app/(chat)/api/finance/filings/route.ts`
`app/(chat)/api/finance/news/route.ts`
`app/(chat)/api/finance/attention/route.ts`
`app/(chat)/api/finance/research/route.ts`
`app/(chat)/api/finance/strategy/route.ts`

* [x] En tête de **chaque** route :

  * [x] `export const runtime = 'nodejs'`
* **Critères** : aucun handler ne tourne en edge ; les scrapers fonctionnent localement.

---

# 3) Tools IA — validation robuste (zod + persistance)

**Fichier** : `lib/ai/tools-finance.ts`

* [x] **Sections présentes et stables**

  * [x] `finance.{get_quote,get_ohlc,compute_indicators,compute_risk,get_fundamentals,get_filings,news,search_symbol}`
  * [x] `ui.{show_chart,add_annotation,remove_annotation,focus_area}` (avec `emitUIEvent`)
  * [x] `research.{create,add_section,update_section,finalize,get}`
  * [x] `strategy.{start_wizard,propose,backtest,refine,finalize,list,get}`
* [x] **Validation d’entrées**

  * [x] Tous les inputs des tools sont validés via **`zod`** (timeframe, symbole, fenêtres d’indicateurs, etc.).
* [x] **Persistance**

  * [x] Utiliser `persistAnalysis(...)` pour journaliser résultats clés (y compris stratégie/backtest).
* **Critères** : erreurs claires (`zod`) côté tool ; logs d’analyse visibles dans “Mes analyses”.

---

# 4) Prompts système — FR/EN + consignes finance/TA

**Fichier** : `lib/ai/prompts.ts`

* [x] **Bloc FR** (présent et à jour)

  * [x] « Données **publiques**, **non garanties** (Yahoo/SEC/RSS). **Pas un conseil en investissement.** »
  * [x] « Préciser la **timeframe** avant `ui.show_chart`. »
  * [x] « Utiliser `compute_indicators` pour l’analyse technique. »
  * [x] « Structurer : **Résumé, Contexte, Données, Graphiques, Signaux, Risques, Sources**. »
* [x] **Bloc EN** (miroir du FR)

  * [x] “Data is **public** and **not guaranteed**. **Not investment advice.**”
  * [x] “Specify **timeframe** before `ui.show_chart`.”
  * [x] “Use `compute_indicators` for TA.”
  * [x] “Structure: **Summary, Context, Data, Charts, Signals, Risks, Sources**.”
* [x] **Propagation locale**

  * [x] Si nécessaire, faire remonter `locale` dans la construction du prompt.
* **Critères** : sections/phrases **détectables** par tests (FR/EN).

---

# 5) DB & Queries — complétude Stratégie/Research

**Fichiers** : `lib/db/schema.ts`, `lib/db/queries.ts`, `lib/db/migrate.ts`

* [x] **Schéma**

  * [x] Tables présentes : `Analysis`, `Research`, `AttentionMarker`, `Strategy`, `StrategyVersion`, `StrategyBacktest`
  * [x] Colonnes **`jsonb`** pour paramètres/résultats.
* [x] **Queries**

  * [x] `createStrategy`, `listStrategiesByChat`, `getStrategyById`
  * [x] `createStrategyVersion`, `saveBacktest`, `updateStrategyStatus`
  * [x] `listResearchByChatId`, `saveAnalysis`, `saveAttentionMarker`
* [x] **Migration**

  * [x] Générer/mettre à jour si besoin (index `(chatId, updatedAt)` pour listes).
* **Critères** : CRUD stratégie et recherches **OK** ; listings paginés stables.

---

# 6) Dashboard Bento — polissage & cohérence

**Fichiers** :
`app/page.tsx`
`components/dashboard/BentoGrid.tsx`
`components/dashboard/BentoCard.tsx`
`components/dashboard/tiles/CurrentPricesTile.tsx`
`components/dashboard/tiles/NewsTile.tsx`
`components/dashboard/tiles/StrategiesTile.tsx`
`components/dashboard/tiles/AnalysesTile.tsx`
`components/dashboard/tiles/MenuTile.tsx`

* [x] **Page d’accueil** (`app/page.tsx`)

  * [x] SSR de données initiales **Prices + News** (TTL raisonnable).
  * [x] Injection du **LanguageSwitcher** (si non présent).
* [x] **CurrentPricesTile**

  * [x] Polling quotes (10–15s) via routes finance (SSR + hydrate).
  * [x] WS Binance pour crypto (fallback polling).
  * [x] Formats numériques selon **locale** (`Intl.NumberFormat`).
* [x] **NewsTile**

  * [x] Agrégation RSS (Yahoo/Reuters/Nasdaq si public).
  * [x] **Sanitize** description (cheerio/DOMPurify).
  * [x] Dates relatives via `Intl.RelativeTimeFormat`.
* [x] **StrategiesTile**

  * [x] Listing par **chatId**, statut `draft/proposed/validated`.
  * [x] Action “Créer une stratégie” → **StrategyWizard**.
* [x] **AnalysesTile**

  * [x] Listing `Analysis` & `Research` **par chat**.
  * [x] Filtres (type, symbole).
* [x] **MenuTile** (pas overlay)

  * [x] `financeToolbarItems` **inline** (pas `position: fixed`, pas backdrop, z-index normal).
* **Critères** : 4 tuiles visibles, interacs stables, FR/EN partout (labels, formats).

---

# 7) ChartPanel — API de manipulation & qualité

**Fichier** : `components/finance/ChartPanel.tsx`

* [x] **Import** direct : `import { createChart } from 'lightweight-charts'`
* [x] **API ref** (exposée via `ref`)

  * [x] `setData(seriesOrId, ohlc)`
  * [x] `addOverlay(type, params)`
  * [x] `addStudy(name, params)`
  * [x] `addAnnotation({ at, text, kind })`
  * [x] `focusArea({ from, to })`
* [x] **UX** : resize, crosshair events, timeScale navigation.
* **Critères** : `ui.show_chart` + `ui.add_annotation` fonctionnent en conditions réelles.

---

# 8) Boucle Stratégies — wizard → propose → backtest → refine → finalize

**Fichiers** :
`components/finance/StrategyWizard.tsx`
`components/finance/StrategyCard.tsx`
`components/finance/BacktestReport.tsx`
`lib/finance/backtest.ts`
`app/(chat)/api/finance/strategy/route.ts`
`lib/ai/tools-finance.ts`

* [x] **Wizard** (bilingue)

  * [x] Questions : horizon, risque, univers, coûts/slippage, drawdown toléré, contraintes (ESG, fréquences…).
  * [x] Appels tools : `strategy.start_wizard` → `strategy.propose`.
* [x] **Backtest**

  * [x] Moteur bar-by-bar (OHLC), coûts & slippage, equity curve.
  * [x] Métriques : **CAGR, Sharpe, Sortino, MDD, Profit Factor, Hit-rate**.
* [x] **Refine**

  * [x] Ajustements paramétriques selon feedback + relance backtest, journalisation via `persistAnalysis`.
* [x] **Finalize**

  * [x] Statut validé + versionnage (`StrategyVersion`).
* **Critères** : au moins **2 itérations** propose→backtest→refine ; rapport clair (FR/EN).

---

# 9) Scrapers publics — timeouts, retries, fallbacks, cache

**Fichiers** :
`lib/finance/sources/{yahoo.ts, stooq.ts, binance.ts, sec.ts, news.ts}`
`lib/finance/live.ts`
`lib/finance/cache.ts`
`lib/finance/rate-limit.ts`

* [x] **Timeouts** 10s (AbortController).
* [x] **Retries** 2× (backoff expo, jitter).
* [x] **Fallbacks**

  * [x] OHLC : Yahoo → Stooq (daily).
  * [x] Crypto : Binance WS → REST klines.
* [x] **Cache TTL**

  * [x] Intraday 10–15s ; Daily 5–10 min.
* [x] **Rate-limit** par domaine (Yahoo/SEC).
* **Critères** : réseau flaky toléré ; messages d’erreur explicites.

---

# 10) i18n — FR/EN bout en bout

**Fichiers** :
`middleware.ts`
`i18n/config.ts`
`app/layout.tsx`
`messages/fr/*.json`, `messages/en/*.json`
`components/i18n/LanguageSwitcher.tsx`

* [x] **Middleware** : détection/rewrites `/` → `/fr` (par défaut).
* [x] **Config** : `locales = ['fr','en']`, `defaultLocale = 'fr'`.
* [x] **Provider** dans `app/layout.tsx` (next-intl).
* [x] **Dictionnaires** : `common`, `dashboard`, `finance` (terminologie harmonisée).
* [x] **LanguageSwitcher** visible sur la page d’accueil.
* **Critères** : bascule live FR↔EN ; formats dates/nombres corrects.

---

# 11) Sécurité & hygiène

**Fichiers** : scrapers, `components/dashboard/tiles/NewsTile.tsx`, `lib/finance/sources/news.ts`

* [x] **Sanitize** HTML des RSS (DOMPurify côté client ou nettoyage côté serveur via cheerio).
* [x] **User-Agent** générique (SEC) sans secret.
* [x] **Scan secrets** (aucune clé, aucun bearer).
* **Critères** : Zéro XSS dans NewsTile ; aucun secret en repo.

---

# 12) Accessibilité & ergonomie

**Fichiers** : toutes les tuiles + finance UI

* [x] **ARIA** : `aria-labelledby`/`aria-label` sur tuiles et boutons.
* [x] **Focus** visible, navigation clavier sur MenuTile.
* [x] **Skeletons** de chargement, **Empty states** bilingues.
* **Critères** : audit rapide via tab/shift+tab ; absence de “pièges” focus.

---

# 13) Tests — unit/API/AI/E2E

**Fichiers** : sous `tests/…`

* [x] **Unitaires Finance**

  * [x] `tests/finance/{yahoo,stooq,binance,sec}.test.ts` : timeouts/retries/fallbacks (mocks).
  * [x] `tests/finance/{indicators,risk,strategies}.test.ts` : valeurs connues.
  * [x] `tests/finance/backtest.test.ts` : **CAGR/Sharpe/Sortino/MDD/PF/Hit-rate**.
* [x] **API**

  * [x] `tests/api/finance/{quote,ohlc}.test.ts`
  * [x] `tests/api/finance/strategy.test.ts`
* [x] **AI/tools**

  * [x] `tests/ai/tools-finance.strategy.test.ts` : wizard→propose→backtest→refine→finalize (mocks persist/UI).
  * [x] `tests/ai/prompts-i18n.test.ts` : disclaimers/sections FR/EN.
* [ ] **E2E** (Playwright)

  * [x] `tests/e2e/dashboard.spec.ts` : 4 tuiles + menu tuile (non overlay).
  * [x] `tests/e2e/strategy-wizard.spec.ts` : scénario complet (avec assertions UI).
* **Critères** : suite **verte**, timeouts réseau mockés pour stabilité CI.

---

# 14) Documentation

**Fichiers** : `AGENTS.md`, `README.md`

* [x] **AGENTS.md**

  * [x] Spécs `strategy.*`, `ui.*`, `research.*` (args/retours), exemples FR/EN.
  * [x] Limites scraping public / rate-limit / TTL.
* [x] **README.md**

  * [x] Capture dashboard, **disclaimer FR/EN**.
  * [x] i18n : usage des locales, switch, formats.
  * [x] Scripts utiles (`pnpm test:e2e`, etc.).
* **Critères** : onboarding clair ; pas d’ambiguïté sur “public only”.

---

# 15) CI & qualité

**Fichiers** : workflow CI (si présent), config test

* [x] **CI** : exécuter unit/API/AI/E2E (têteless), mock réseau pour sources publiques.
* [ ] **Seuils** couverture (ex. lignes ≥ 70%).
* [x] **Lint/format** (ESLint/Prettier) sur PR.
* **Critères** : pipeline stable, pas de flaky tests.

---

## Micro-lot de départ (recommandé)

* [x] **Vérifier/patcher** `app/(chat)/api/chat/route.ts` (mapping `strategy.*` + `experimental_activeTools`).
* [x] **Confirmer** `runtime='nodejs'` (toutes routes finance).
* [x] **Compléter** prompts FR/EN si phrasing manquant.
* [x] **Ajouter/compléter** tests : `backtest.test.ts`, `prompts-i18n.test.ts`, `e2e/dashboard.spec.ts`.

Tu peux donner ce plan à l’agent : il peut dérouler de haut en bas. Une fois ce lot validé, on verrouille la robustesse scraping (timeouts/retries/fallbacks), puis on boucle sur les tests E2E et l’i18n fine (terminologie, formats).

## Tool specifications

### strategy.*

- `strategy.start_wizard` — params `{ horizon: string, risk: string, universe: string }` → starts localized Q&A.
- `strategy.propose` — params `{ constraints: string[] }` → returns draft strategy.
- `strategy.backtest` — params `{ symbol: string, timeframe: string }` → returns metrics and equity curve.
- `strategy.refine` — params `{ adjustments: Record<string,unknown> }` → returns updated proposal.
- `strategy.finalize` — params `{ id: string }` → stores validated strategy.
- `strategy.list` — params `{ chatId: string }` → lists strategies for chat.
- `strategy.get` — params `{ id: string }` → retrieves a strategy.

Exemple FR :
```ts
await callTool('strategy.start_wizard', { horizon: '1Y', risque: 'moyen' });
```

Example EN:
```ts
await callTool('strategy.backtest', { symbol: 'AAPL', timeframe: '1d' });
```

### ui.*

- `ui.show_chart` — params `{ symbol: string, timeframe: string }` → renders OHLC chart.
- `ui.add_annotation` — params `{ at: string, text: string }` → marks chart.
- `ui.remove_annotation` — params `{ id: string }`.
- `ui.focus_area` — params `{ from: string, to: string }` → zooms chart.

### research.*

- `research.create` — params `{ title: string }` → creates research doc.
- `research.add_section` — params `{ id: string, heading: string, content: string }`.
- `research.update_section` — params `{ id: string, sectionId: string, content: string }`.
- `research.finalize` — params `{ id: string }` → locks document.
- `research.get` — params `{ id: string }` → fetches existing doc.

### Scraping limits

- Only public endpoints: Yahoo, Stooq, Binance, SEC/EDGAR, RSS feeds.
- HTTP requests use 10s timeout, two retries with jittered backoff.
- Cache TTLs: intraday 15 s, daily 5–10 min.

## History

- Reset AGENTS.md with provided checklist.
- Verified chat route tool exposure, confirmed Node.js runtimes, ensured FR/EN prompts, and ran finance, AI, and dashboard tests.
- Resolved Next.js font loader build error, added `research.get` tool with persistence, and marked tool validation tasks complete.
- Implemented dashboard caching TTL, verified DB schema and queries, checked dashboard tiles, chart panel, and i18n configuration.
- Added jitter to HTTP retries, implemented Binance WebSocket fallback to REST polling, and marked timeout, retry, fallback, cache, rate-limit, and RSS sanitization tasks complete.
- Added status role to dashboard empty states, ensured menu button uses explicit type, and verified API tests for quotes, OHLC, and strategy.
- Converted strategy lifecycle test to Playwright, ran full suite including AI tools.
- Added UI E2E test for strategy wizard, mocked backend, and marked checklist accordingly.
- Added mocked unit tests for Yahoo, Binance, and Stooq sources to verify retries and fallbacks, and confirmed indicators, risk, and strategies tests with known values.
- Extended strategy wizard with drawdown and constraint steps, updated API route, translations, and tests.
- Ensured `experimental_activeTools` always exposes full prefixed tool map, attempted build, ran unit and E2E dashboard tests (missing system deps).
- Fixed `experimental_activeTools` type mismatch, introduced `test:e2e` script, and documented tool specs and scraping limits.
- Verified build after resolving font loader issue and executed full test suite (56 passed).
- Installed Playwright browser dependencies and pointed `NEXT_INTL_CONFIG` to an absolute path in the E2E config, but dashboard and wizard browser tests still fail to find expected headings.
- Fixed remaining lint violations (button types, implicit anys, accessible labels), switched EventEmitter import to `events` to restore build, and confirmed `pnpm lint`, `pnpm build`, and `pnpm test` succeed.
- Verified backtest, refine, and finalize flows end-to-end, ran `pnpm build` and `pnpm test` successfully, and checked off strategy lifecycle tasks.
- Re-ran `pnpm build` and `pnpm test` successfully, installed Playwright browsers and OS deps, but `pnpm test:e2e` fails with missing `next-intl` config and absent “Cours actuels” heading.
- Configured CI workflow to lint, build, and run tests via `pnpm test`.
- Audited dependencies and confirmed all data sources are public-only, checking off the API-key avoidance requirement.
- Adjusted Playwright detection in `app/layout.tsx`, introduced an `EventTarget`-based UI dispatcher, and set an absolute `NEXT_INTL_CONFIG` in `playwright.config.ts`; `pnpm build` succeeds but `pnpm test:e2e` still fails to locate dashboard elements.
