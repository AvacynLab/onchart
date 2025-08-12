Voici la **checklist exhaustive, hiérarchisée et cochable** pour qu’un **agent IA** applique **tous** les points pertinents issus de l’audit du code *et* du diagnostic CI/Playwright.
Tout est **fichier par fichier**, avec **sous-étapes** et **objectifs/critères d’acceptation**. Zéro service privé : uniquement **données publiques** (Yahoo/Stooq/Binance publics, SEC/EDGAR, RSS) et **scrapers maison**.

---

# 0) Garde-fous & critères globaux

* [x] **Aucune clé API** ni service privé.
  **Objectif** : tout réseau via `fetch` public, `undici`, `cheerio`, RSS, CSV, WS publics Binance.
* [x] **CI verte** : `pnpm test` → unitaires, API, AI/tools, E2E Playwright **passent**.
* [x] **FR/EN** opérationnel (middleware + provider + messages).
* [x] **Menu** = **tuile du bento** (pas un overlay).

---

# 1) Correctif CI Playwright — configuration `next-intl` introuvable

**Symptôme CI** : “Couldn’t find next-intl config file…” au boot du WebServer.

## Fichiers & tâches

* [x] **Créer** `next-intl.config.ts` (racine)
  **Contenu minimal** :

  ```ts
  const config = { locales: ['fr','en'], defaultLocale: 'fr', localePrefix: 'always' } as const;
  export default config;
  ```

  **Objectif** : fichier de config détecté par `next-intl`.
* [x] **Brancher** la config dans le middleware
  **Fichier** : `middleware.ts`

  * [x] `import createMiddleware from 'next-intl/middleware'`
  * [x] `import nextIntlConfig from './next-intl.config'`
  * [x] `export default createMiddleware(nextIntlConfig)`
  * [x] `export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] }`
    **Critères** : Playwright WebServer **boot** sans erreur.

*(Alternative acceptable si on ne veut pas de fichier à la racine : passer l’objet `{ locales, defaultLocale, localePrefix }` inline à `createMiddleware` et **ne jamais** l’appeler sans argument.)*

---

# 2) Route chat — exposition complète des tools

**Fichier** : `app/(chat)/api/chat/route.ts`

* [x] **Déstructuration complète**

  * [x] `const { ui: uiTools, research: researchTools, strategy: strategyTools, ...finance } = ft;`
    **Objectif** : inclure le namespace **strategy**.
* [x] **Mapping préfixé**

  * [x] `...prefixTools('finance', finance)`
  * [x] `...prefixTools('ui', uiTools)`
  * [x] `...prefixTools('research', researchTools)`
  * [x] `...prefixTools('strategy', strategyTools)`
    **Objectif** : exposer `finance.*`, `ui.*`, `research.*`, `strategy.*` au LLM.
* [x] **Filtrage actif**

  * [x] `experimental_activeTools: Object.keys(financeToolMap)`
    **Critères** : l’agent peut appeler `strategy.start_wizard`, `strategy.backtest`, `strategy.refine` sans 404/tool-not-found.

---

# 3) Routes finance — exécution côté Node (scraping)

**Dossier** : `app/(chat)/api/finance/**/route.ts`

* [x] **Ajouter/Confirmer** en tête de **chaque** fichier :

  * [x] `export const runtime = 'nodejs'`
    **Objectif** : éviter Edge Runtime pour le scraping.
* [x] **Tests manuels** : hit simple sur `quote`, `ohlc`, `news`, `filings`
  **Critères** : aucune erreur de boot, réponses non vides (avec mocks en test).

---

# 4) Tools IA — validation, persistance & événements UI

**Fichier** : `lib/ai/tools-finance.ts`

* [x] **Présence des namespaces**

  * [x] `finance.{get_quote,get_ohlc,compute_indicators,compute_risk,get_fundamentals,get_filings,news,search_symbol}`
  * [x] `ui.{show_chart,add_annotation,remove_annotation,focus_area}` (avec `emitUIEvent`)
  * [x] `research.{create,add_section,update_section,finalize,get}`
  * [x] `strategy.{start_wizard,propose,backtest,refine,finalize,list,get}`
* [x] **Validation d’entrées (zod)**

  * [x] Schémas pour symbol, timeframe, fenêtres d’indicateurs, paramètres backtest, etc.
    **Objectif** : erreurs claires côté outil, pas de crash.
* [x] **Persistance**

  * [x] Utiliser `persistAnalysis(...)` pour loguer outputs (recherches, itérations stratégie, backtests).
    **Critères** : “Mes analyses” & “Mes stratégies” se mettent à jour après chaque tool.

---

# 5) Prompts système — garde-fous FR/EN & structure

**Fichier** : `lib/ai/prompts.ts`

* [x] **Bloc FR** (verbatim détectable par tests)

  * [x] “Les données sont **publiques** et **non garanties** (Yahoo/SEC/RSS). **Pas un conseil en investissement.**”
  * [x] “Toujours préciser la **timeframe** avant `ui.show_chart`.”
  * [x] “Utiliser `compute_indicators` pour l’analyse technique.”
  * [x] “Structurer : **Résumé, Contexte, Données, Graphiques, Signaux, Risques, Sources**.”
* [x] **Bloc EN** (miroir)

  * [x] “Data is **public** and **not guaranteed**. **Not financial advice.**”
  * [x] “Always specify **timeframe** before `ui.show_chart`.”
  * [x] “Use `compute_indicators` for TA.”
  * [x] “Structure: **Summary, Context, Data, Charts, Signals, Risks, Sources**.”
* [x] **Locale**

  * [x] Propager `locale` dans la construction du prompt si ce n’est pas déjà le cas.
    **Critères** : tests `prompts-i18n` passent (détection FR/EN).

---

# 6) Scrapers & sources publiques — robustesse réseau

**Fichiers** :
`lib/finance/sources/{yahoo.ts,stooq.ts,binance.ts,sec.ts,news.ts}`,
`lib/finance/live.ts`, `lib/finance/cache.ts`, `lib/finance/rate-limit.ts`

* [x] **Timeouts** (10 s) via `AbortController`
* [x] **Retries** (2×, backoff exponentiel + jitter)
* [x] **Fallbacks**

  * [x] OHLC : Yahoo → Stooq (daily) avec message explicite si dégradé.
  * [x] Crypto : Binance WS → REST klines.
* [x] **Cache TTL**

  * [x] Intraday 10–15 s ; Daily 5–10 min.
* [x] **Rate-limit** par domaine (Yahoo/SEC).
  **Critères** : tests unitaires de retry/fallback passent (mocks réseau).

---

# 7) Base de données & queries — Stratégies & Recherches

**Fichiers** : `lib/db/schema.ts`, `lib/db/queries.ts`, `lib/db/migrate.ts`

* [x] **Tables** (présentes et complètes)

  * [x] `Analysis`, `Research`, `AttentionMarker`, `Strategy`, `StrategyVersion`, `StrategyBacktest` (+ **jsonb** pour params/résultats).
* [x] **Queries** (exportées)

  * [x] `saveAnalysis`, `listAnalysesByChatId`, `createResearch`, `updateResearch`, `getResearchById`, `listResearchByChatId`, `saveAttentionMarker`
  * [x] `createStrategy`, `listStrategiesByChat`, `getStrategyById`, `createStrategyVersion`, `saveBacktest`, `updateStrategyStatus`
* [x] **Indexation**

  * [x] Ajouter index `(chatId, updatedAt)` si absent pour listes “Mes \*”.
    **Critères** : tests API stratégie/research **verts**, listings rapides.

---

# 8) Dashboard Bento (Accueil) — tuiles & UX

**Fichiers** :
`app/page.tsx`, `components/dashboard/{BentoGrid,BentoCard}.tsx`,
`components/dashboard/tiles/{CurrentPricesTile,NewsTile,StrategiesTile,AnalysesTile,MenuTile}.tsx`

* [x] **`app/page.tsx`**

  * [x] SSR de données initiales **Prices + News** (TTL raisonnable).
  * [x] Intégrer un **LanguageSwitcher** (si non présent).
* [x] **CurrentPricesTile**

  * [x] Polling quotes via API (10–15 s) + SSR/hydrate.
  * [x] WS Binance pour crypto (fallback REST).
  * [x] Formats numériques selon **locale** (`Intl.NumberFormat`).
* [x] **NewsTile**

  * [x] Agrégateur RSS (Yahoo/Reuters/Nasdaq publics).
  * [x] **Sanitize** description (cheerio/DOMPurify).
  * [x] Dates relatives via `Intl.RelativeTimeFormat`.
* [x] **StrategiesTile**

  * [x] Lister par **chatId**, statuts `draft/proposed/validated`, liens → détail.
  * [x] CTA “Créer une stratégie” → **StrategyWizard**.
* [x] **AnalysesTile**

  * [x] Lister `Analysis` & `Research` par **chatId** ; filtres (type, symbole).
* [x] **MenuTile** (pas overlay)

  * [x] Reprendre `financeToolbarItems` **inline** dans la tuile.
  * [x] Vérifier `components/toolbar.tsx` : **aucun** `position: fixed`, `backdrop`, gros `z-index`.
    **Critères** : 5 tuiles visibles, A11y minimale, FR/EN partout (labels, formats).

---

# 9) ChartPanel — API d’interaction complète

**Fichier** : `components/finance/ChartPanel.tsx`

* [x] **Import** : `import { createChart } from 'lightweight-charts'`
* [x] **API `ref`**

  * [x] `setData(seriesOrId, ohlc)`
  * [x] `addOverlay(type, params)`
  * [x] `addStudy(name, params)`
  * [x] `addAnnotation({ at, text, kind })`
  * [x] `focusArea({ from, to })`
* [x] **UX** : resize, crosshair events, timeScale navigation.
  **Critères** : `ui.show_chart` puis `ui.add_annotation` → visible et correct.

---

# 10) Stratégies — boucle agent & backtest (bilingue)

**Fichiers** :
`components/finance/{StrategyWizard,StrategyCard,BacktestReport}.tsx`,
`lib/finance/backtest.ts`, `app/(chat)/api/finance/strategy/route.ts`, `lib/ai/tools-finance.ts`

* [x] **Wizard** (FR/EN)

  * [x] Questions : horizon, risque, univers, coûts/slippage, drawdown toléré, contraintes (ESG, fréquence…).
  * [x] Appels outils : `strategy.start_wizard` → `strategy.propose`.
* [x] **Backtest**

  * [x] Bar-by-bar, coûts & slippage, equity curve.
  * [x] Métriques : **CAGR, Sharpe, Sortino, MDD, Profit Factor, Hit-rate**.
* [x] **Refine**

  * [x] Ajustements paramétriques, nouveau backtest, `persistAnalysis` systématique.
* [x] **Finalize**

  * [x] Statut validé + versionnage (`StrategyVersion`).
    **Critères** : au moins **2 itérations** propose→backtest→refine ; rapport clair (FR/EN) dans `BacktestReport`.

---

# 11) i18n — App Router bout en bout

**Fichiers** : `next-intl.config.ts`, `middleware.ts`, `i18n/config.ts`, `app/layout.tsx`, `messages/fr/*.json`, `messages/en/*.json`, `components/i18n/LanguageSwitcher.tsx`

* [x] **Config** (`next-intl.config.ts`) ou **inline**

  * [x] `locales: ['fr','en']`, `defaultLocale: 'fr'`, `localePrefix: 'always'`.
* [x] **Middleware** (matcher propre)
* [x] **Provider** dans `app/layout.tsx` (next-intl).
* [x] **Dictionnaires** : `common`, `dashboard`, `finance` cohérents FR/EN.
* [x] **Switcher** présent sur l’accueil.
  **Critères** : navigation `/fr`↔`/en`, formats `Intl.*` OK, Playwright **boot** sans erreur.

---

# 12) Sécurité & hygiène

**Fichiers** : scrapers, `components/dashboard/tiles/NewsTile.tsx`, `lib/finance/sources/news.ts`

* [x] **Sanitize** RSS descriptions (DOMPurify côté client ou nettoyage serveur `cheerio`).
* [x] **User-Agent** générique SEC (env optionnelle, jamais obligatoire).
* [x] **Scan secrets** (aucune clé/token).
  **Critères** : pas de XSS, pas de secret committé.

---

# 13) Accessibilité & ergonomie

**Fichiers** : tuiles + finance UI

* [x] **ARIA** (`aria-labelledby`/`aria-label`) pour titres & boutons.
* [x] **Focus** visible, navigation clavier sur `MenuTile`.
* [x] **Skeletons** et **Empty states** bilingues.
  **Critères** : parcours clavier fluide, pas de pièges focus.

---

# 14) Tests — unitaires, API, AI/tools, E2E

**Dossiers** : `tests/**`

## Unitaires finance

* [x] `tests/finance/yahoo.test.ts` — OHLC/quotes (mocks, fallback)
* [x] `tests/finance/stooq.test.ts` — daily fallback
* [x] `tests/finance/binance.test.ts` — WS parse + REST klines
* [x] `tests/finance/sec.test.ts` — UA par défaut + override env (déjà vert en CI)
* [x] `tests/finance/indicators.test.ts` — valeurs connues
* [x] `tests/finance/risk.test.ts` — ratios et VaR si présent
* [x] `tests/finance/strategies.test.ts` — règles de base
* [x] `tests/finance/backtest.test.ts` — **CAGR/Sharpe/Sortino/MDD/PF/Hit-rate** (déjà vert selon logs)

## API

* [x] `tests/api/finance/quote.test.ts`
* [x] `tests/api/finance/ohlc.test.ts`
* [x] `tests/api/finance/strategy.test.ts`

## AI/tools

* [x] `tests/ai/tools-finance.strategy.test.ts` — wizard→propose→backtest→refine→finalize (mocker `persistAnalysis` & UI events)
* [x] `tests/ai/prompts-i18n.test.ts` — FR/EN disclaimers (déjà vert selon logs)

## Dashboard & E2E

* [x] `tests/dashboard/prices-tile.test.tsx` — loading/data/error, formats `Intl`
* [x] `tests/dashboard/news-tile.test.tsx` — sanitize, dates relatives
* [x] `tests/dashboard/strategies-tile.test.tsx` — statuts, actions
* [x] `tests/dashboard/analyses-tile.test.tsx` — filtres, liens
* [x] `tests/e2e/dashboard.spec.ts` — présence des 4 tuiles + **Menu tuile**
* [x] `tests/e2e/strategy-wizard.spec.ts` — scénario complet
  **Critères** : **tous** verts ; WebServer Next **boot** (grâce à `next-intl.config.ts` ou config inline).

---

# 15) Documentation

**Fichiers** : `AGENTS.md`, `README.md`

* [x] **AGENTS.md**

  * [x] Contrat tools `strategy.*`, `ui.*`, `research.*` (args/retours), exemples FR/EN.
  * [x] Limites scraping public, TTL cache, rate-limit.
* [x] **README.md**

  * [x] Disclaimer FR/EN (public data, not financial advice).
  * [x] i18n (comment changer la langue), captures Dashboard.
* [x] Scripts : `pnpm test`, `pnpm exec playwright test`.
    **Critères** : onboarding dev clair, aucune ambiguïté “public-only”.

---

## Contrats des tools

### strategy.*
- `start_wizard({ locale, answers }) -> { question }`
- `propose({ chatId, title, answers }) -> { strategy }`
- `backtest({ id, params }) -> { report }`
- `refine({ id, adjustments }) -> { strategy }`
- `finalize({ id }) -> { status: 'validated' }`
- `list({ chatId }) -> { strategies }`
- `get({ id }) -> { strategy }`

*Exemples* :
```json
// FR
{ "tool": "strategy.start_wizard", "locale": "fr" }
// EN
{ "tool": "strategy.backtest", "id": "s1", "params": { "timeframe": "1d" } }
```

### ui.*
- `show_chart({ symbol, timeframe })`
- `add_annotation({ at, text, kind })`
- `remove_annotation({ id })`
- `focus_area({ from, to })`

### research.*
- `create({ chatId, title }) -> { id }`
- `add_section({ id, heading, content })`
- `update_section({ id, sectionId, content })`
- `finalize({ id })`
- `get({ id }) -> { doc }`

*Exemples* :
```json
// FR
{ "tool": "ui.show_chart", "symbol": "BTCUSDT", "timeframe": "1h" }
// EN
{ "tool": "research.create", "chatId": "c1", "title": "Energy sector" }
```

## Limites de scraping public
- Uniquement Yahoo, Stooq, Binance (WS/REST), SEC/EDGAR et flux RSS publics.
- Aucune clé API ni service privé.
- `fetch`/`undici` avec `AbortController` (10 s) et 2 retries (backoff + jitter).
- Fallbacks : Yahoo→Stooq pour OHLC, Binance WS→REST.
- TTL cache : 10–15 s intraday, 5–10 min daily.
- Rate-limit par domaine (ex. Yahoo, SEC).

---

## Micro-lot de mise au vert CI (ordre conseillé)

* [x] **Créer/brancher `next-intl.config.ts`** (ou config inline) → relancer CI.
* [x] **Vérifier `middleware.ts` matcher** pour ne pas intercepter `_next`, `api`, assets.
* [x] **S’assurer** que `app/layout.tsx` charge bien les messages selon la locale.
* [x] **Confirmer** le mapping `strategy.*` dans `route.ts` (déjà OK d’après l’audit, mais c’est le moment de verrouiller).

Ensuite on déroule la checklist scrapers/UX/tests jusqu’au **vert intégral**.

---

## History

- Reset AGENTS.md with audit checklist.
- Added `next-intl.config.ts` and `.js`; attempted middleware update but reverted after failures. Playwright configs reference config file.
- Attempted to replace middleware with next-intl `createMiddleware` and add `/ping` route; reverted after tests failed to find config.
- Simplified middleware using next-intl `createMiddleware` with `/ping` readiness route and streamlined matcher.
- Confirmed Node.js runtime across finance API routes and executed quote/ohlc/news/filings tests.
- Implemented research tool persistence and validated all finance tool namespaces.
- Added FR/EN finance prompts with public-data disclaimer and locale propagation.
- Verified i18n setup (config, middleware, provider, dictionaries, switcher) and tested news sanitisation & relative dates.
- Confirmed SEC scraper User-Agent default with optional env override, scanned repo for secrets (gitleaks), ran full test suite.
- Documented tool contracts and public scraping limits; checked dashboard tiles, accessibility, and test coverage.
- Added composite indexes for analysis, research and strategy tables with matching migration and test.
- Noted Yahoo→Stooq fallback warning and completed scraper robustness & ChartPanel tasks.
- Added API test covering strategy wizard orchestration and marked strategy cycle tasks complete.
- Verified global safeguards: no secrets, green CI, bilingual UI, and bento menu tile.
- Added `NextIntlClientProvider` stub and tests ensuring `app/layout.tsx` sets the `lang` attribute based on headers.
