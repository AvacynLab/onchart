# AGENTS

## Tasks
Parfait. Voici une **checklist exhaustive et hiérarchisée** (avec sous-étapes et objectifs attendus), **fichier par fichier**, pour intégrer un **agent d’analyse fondamentale & technique** avec **charts interactifs type TradingView**, des **tools d’interaction UI**, et un **système de “recherches” (documents)** réutilisant votre logique d’artifacts.
Contraintes respectées : **uniquement des APIs/lib publiques sans clé** ou **scrapers maison** (Yahoo Finance, Stooq, Binance public, SEC/EDGAR, RSS publics).

> 🧭 L’idée : outiller le chat avec des tools `finance:*` (data, indicateurs, métriques risques, documents de recherche) + un panneau chart “lightweight-charts” interactif + un mécanisme d’annotations/spotlights pilotable par l’agent.

---

# ✅ Tâches à cocher (prêtes pour un agent)

## 0) Préparation & hygiène

* [x] **Installer librairies open-source autorisées**

* [x] Ajouter `lightweight-charts` (render client) — **sans clé**

    * **Fichier**: `package.json`

      * [x] `dependencies.lightweight-charts` (version stable)
      * [x] Vérifier scripts existants (`dev`, `build`, `test`) restent OK
  * [x] Ajouter utilitaires côté serveur

    * **Fichier**: `package.json`

      * [x] `dependencies.undici` (si besoin fetch/agent custom), `zod` (validation), `cheerio` (scraping HTML léger)
* [x] **Interdire exécution scraping à l’edge**

  * **Fichiers**: nouveaux endpoints `app/(chat)/api/finance/*`

    * [x] `export const runtime = 'nodejs'` (évite edge où certains sites bloquent)
* [x] **Politique d’usage**

  * **Fichier**: `README.md`

    * [x] Ajouter clause “données publiques, pas de conseil financier, peut être incomplet/brittle”.

---

## 1) Base de données (Drizzle) – persistance analyses & recherches

* [x] **Créer table `analysis`**

  * **But**: stocker outputs d’analyses (techniques/fondamentales) par chat
  * **Fichiers**:

    * [x] `lib/db/schema.ts`

      * [x] `analysis` : `id (uuid)`, `userId`, `chatId`, `type ('quote'|'ohlc'|'fundamentals'|'risk'|'doc'|...)`, `input (jsonb)`, `output (jsonb)`, `createdAt`
    * [x] `lib/db/migrate.ts` : migration
    * [x] `lib/db/queries.ts`

      * [x] `saveAnalysis({ userId, chatId, type, input, output })`
      * [x] `listAnalysesByChatId({ chatId })`
* [x] **Créer table `research` (documents de recherche)**

  * **But**: “artifacts” Finance (opportunités, deep-dive, FT report, général)
  * **Fichiers**:

    * [x] `lib/db/schema.ts`

      * [x] `research`: `id`, `userId`, `chatId`, `kind ('opportunity'|'asset_deep_dive'|'ft_report'|'general')`, `title`, `sections (jsonb)`, `createdAt`, `updatedAt`
    * [x] `lib/db/queries.ts`

      * [x] `createResearch(...)`, `updateResearch(...)`, `getResearchById(...)`, `listResearchByChatId(...)`
* [x] **Créer table `attention_marker` (annotations sur chart/UI)**

  * **But**: garder la trace des surlignages/annotations de l’agent
  * **Fichiers**:

    * [x] `lib/db/schema.ts`

      * [x] `attentionMarker`: `id`, `userId`, `chatId`, `symbol`, `timeframe`, `payload (jsonb)`, `createdAt`
    * [x] `lib/db/queries.ts`

      * [x] `saveAttentionMarker(...)`, `listAttentionMarkers({ chatId, symbol, timeframe })`
      * [x] `deleteAttentionMarker({ id })`

---

## 2) Scrapers & sources publiques (sans clé)

* [x] **Yahoo Finance (non officiel) – quotes/ohlc/metadata**

  * **But**: données actions/ETF/FX/crypto via endpoints publiques (JSON/CSV)
  * **Fichiers**:

    * [x] `lib/finance/sources/yahoo.ts`

      * [x] `fetchQuoteYahoo(symbol)` → prix, change, marketState
      * [x] `fetchOHLCYahoo(symbol, interval, range|start/end)` → candles
      * [x] `searchYahoo(query)` → autocomplete (v1 search), fallback si bloqué
      * [x] Gestion cookies/crumb si nécessaire (auto-récup)
      * [x] Normalisation symboles (ex: `AAPL`, `^GSPC`, `EURUSD=X`)
* [x] **Stooq – OHLC quotidien (CSV)**

  * **Fichiers**:

    * [x] `lib/finance/sources/stooq.ts`

      * [x] `fetchDailyStooq(symbol)` → CSV→OHLC (fallback si Yahoo indispo)
* [x] **Binance public – crypto ticks/klines**

  * **Fichiers**:

    * [x] `lib/finance/sources/binance.ts`

      * [x] `fetchKlinesBinance(symbol, interval)` (ex: `BTCUSDT`, `1m/5m/1h`)
* [x] **SEC/EDGAR – fondamentaux/filings**

  * **Fichiers**:

    * [x] `lib/finance/sources/sec.ts`

      * [x] `searchCompanyCIK(name|ticker)`
      * [x] `listFilings(cik, formTypes=['10-K','10-Q','8-K'])`
      * [x] `fetchFilingDocument(url)` → HTML→texte (cheerio)
      * [x] Parser JSON “companyfacts” (lignes clés : revenues, EPS, assets, liabilities)
      * [x] Respect `User-Agent` (email générique si pas de `.env`)
* [x] **News (sans clé) – RSS publics**

  * **Fichiers**:

    * [x] `lib/finance/sources/news.ts`

      * [x] `fetchRssFeeds(symbol|keyword)` : Yahoo Finance RSS, Reuters Business RSS, Nasdaq RSS (si dispo)
      * [x] `extractItems(html/xml)` → `title, link, pubDate, summary`
* [x] **Cache & rate limiting**

  * **Fichiers**:

    * [x] `lib/finance/cache.ts`

      * [x] LRU simple (clé = url+params), TTL (ex: 15s intraday, 5m daily)
    * [x] `lib/finance/rate-limit.ts`

      * [x] Token bucket par domaine (Yahoo, Binance, SEC)

---

## 3) Analyse locale (indicateurs & risques)

* [x] **Indicateurs techniques (pur TS, aucun service externe)**

  * **Fichiers**:

    * [x] `lib/finance/indicators.ts`

      * [x] `SMA`, `EMA`, `RSI`, `MACD`, `Signal`, `Histogram`, `Bollinger (middle, upper, lower)`, `ATR`, `Stochastic`
      * [x] Validation d’entrée via `zod`
* [x] **Métriques de risque**

  * **Fichiers**:

    * [x] `lib/finance/risk.ts`

      * [x] Volatilité annualisée, Max Drawdown, Sharpe (rf param), Sortino, Beta (vs benchmark si fourni)
* [x] **Signaux simples/Stratégies**

  * **Fichiers**:

    * [x] `lib/finance/strategies.ts`

      * [x] `maCrossover`, `rsiReversion`, `breakoutBB`, avec signaux `enter/exit`, backtest naïf (sur OHLC local)

---

## 4) Tools IA “finance:*” (branchés dans le chat)

> Intégration via le bloc `tools: { ... }` de `app/(chat)/api/chat/route.ts`.

* [x] **Créer paquet de tools**

  * **Fichiers**:

    * [x] `lib/ai/tools-finance.ts`

      * [x] `finance.get_quote({ symbol })`
      * [x] `finance.get_ohlc({ symbol, timeframe, range|start,end, source? })`
      * [x] `finance.search_symbol({ query })`
      * [x] `finance.get_fundamentals({ ticker|cik })` (agrège SEC companyfacts + ratios calculés localement)
      * [x] `finance.get_filings({ ticker|cik, forms })` (liste + liens)
      * [x] `finance.compute_indicators({ ohlc, list })`
      * [x] `finance.compute_risk({ prices, benchmark? })`
      * [x] `finance.news({ symbol|query, window })`
      * [x] **Tools UI/Chart**

        * [x] `ui.show_chart({ symbol, timeframe, range, overlays, studies })`
        * [x] `ui.add_annotation({ symbol, timeframe, at, type, text })`
        * [x] `ui.remove_annotation({ id })`
        * [x] `ui.focus_area({ symbol, timeframe, start, end, reason })`
      * [x] **Tools “Documents de recherche”**

        * [x] `research.create({ kind, title, sections? })`
        * [x] `research.add_section({ id, section })`
        * [x] `research.update_section({ id, sectionId, content })`
        * [x] `research.finalize({ id })`
      * [x] Chaque tool : **schéma d’arguments `zod`**, **retour JSON** clair, persistance via `saveAnalysis`/`createResearch` si pertinent.
* [x] **Brancher dans la route chat**

  * **Fichier**: `app/(chat)/api/chat/route.ts`

    * [x] Importer `tools-finance.ts`
    * [x] Étendre `tools: { ... }` avec `finance:*`, `ui:*`, `research:*`
    * [x] Sur réponses `ui:*`, émettre aussi un **évènement UI** (voir section UI)
* [x] **Prompt système & hints**

  * **Fichier**: `lib/ai/prompts.ts`

    * [x] Ajouter bloc “capabilities finance” + guidelines :

      * [x] Toujours valider symboles
      * [x] Préciser timeframe avant `ui.show_chart`
      * [x] Utiliser `compute_indicators` pour analyses techniques
      * [x] Produire brefs résumés chiffrés et mentionner “données publiques non garanties”

---

## 5) API routes dédiées (séparation des responsabilités)

* [x] **Endpoints data** (server-only, runtime nodejs)

  * **Fichiers**:

    * [x] `app/(chat)/api/finance/quote/route.ts`

      * [x] GET `?symbol=` → Yahoo→Binance fallback → cache
    * [x] `app/(chat)/api/finance/ohlc/route.ts`

      * [x] GET `?symbol=&interval=&range=` → Yahoo→Stooq/Binance fallback
    * [x] `app/(chat)/api/finance/fundamentals/route.ts`

      * [x] GET `?ticker=` → SEC companyfacts + ratios calculés
    * [x] `app/(chat)/api/finance/filings/route.ts`

      * [x] GET `?ticker=&forms=10-K,10-Q` → EDGAR index
    * [x] `app/(chat)/api/finance/news/route.ts`

      * [x] GET `?symbol=&window=` → RSS agrégé
* [x] **Endpoints UI/annotations**

  * **Fichiers**:

    * [x] `app/(chat)/api/finance/attention/route.ts`

      * [x] POST `save` / DELETE `remove` / GET `list` pour `attentionMarker`
* [x] **Endpoints research**

  * **Fichiers**:

    * [x] `app/(chat)/api/finance/research/route.ts`

      * [x] POST `create` / PATCH `update` / GET `list|byId`

---

## 6) UI Charts & interaction (type TradingView)

* [x] **Panneau Chart réutilisable**

  * **Fichiers**:

    * [x] `components/finance/ChartPanel.tsx`

      * [x] Render `lightweight-charts`
      * [x] Props: `symbol`, `timeframe`, `seriesType ('candlestick'|'line')`, `overlays`, `studies`, `annotations`
      * [x] Méthodes imperatives via `ref`: `setData`, `addOverlay`, `addStudy`, `addAnnotation`, `focusArea`
      * [x] Gestion resize, thème, timeScale, crosshair events
    * [x] `components/finance/ChartToolbar.tsx`

      * [x] Sélection timeframe (1m, 5m, 1h, 1d), type de série, toggles indicateurs
    * [x] `components/finance/AttentionLayer.tsx`

      * [x] Rendu annotations (labels, flèches, zones), cliquables → ouvrent un “hint AI”
* [x] **Intégration dans le chat**

  * **Fichiers**:

    * [x] `app/(chat)/page.tsx` + `app/(chat)/[id]/page.tsx`

      * [x] Ajouter un **panneau latéral** “Finance” pliable
      * [x] Sur évènements `ui.show_chart`, **montrer/mettre à jour** `ChartPanel`
      * [x] Sur `ui.add_annotation`, **synchroniser** `AttentionLayer` + persister via API
    * [x] `components/suggestion.tsx` / `components/toolbar.tsx`

      * [x] Boutons rapides : “Afficher AAPL 1D”, “Scanner opportunités FX”
* [x] **Évènements temps réel (optionnel)**

  * [x] Introduire un simple EventEmitter (ou canal SSE déjà existant) pour pousser actions UI déclenchées par tools
  * **Fichiers**:

    * [x] `lib/ui/events.ts`
    * [x] Abonnements dans `ChartPanel.tsx`

---

## 7) “Documents de recherche” (artifacts-like)

* [x] **Types de recherches**

  * `opportunity` (général ou devise précise)
  * `asset_deep_dive` (entreprise/asset spécifique)
  * `ft_report` (fondamental+technique avec graphique & stratégie)
  * `general` (recherche libre plus/moins structurée)
* [x] **Composants UI**

  * **Fichiers**:

    * [x] `components/finance/research/ResearchDoc.tsx`

      * [x] Affiche sections : `Summary`, `Market Context`, `Data`, `Charts`, `Signals`, `Risks`, `Sources`
    * [x] `components/finance/research/ResearchList.tsx`

      * [x] Liste/reprise des recherches liées au chat
* [x] **Tools IA de création/mise à jour**

  * (déjà listés en 4) reliés à `research.*` + persistance `research` table
* [x] **Prompting**

  * **Fichiers**:

    * [x] `lib/ai/prompts.ts`

      * [x] Garde-fous: structuration sections, chiffres sourcés, signaux VS risques, “pas de conseil en investissement”

---

## 8) Validation d’entrée & normalisation symboles

* [x] **Schémas & mapping symboles**

  * **Fichiers**:

    * [x] `lib/finance/symbols.ts`

      * [x] Normaliser entrées (ex: `BTC/USDT` → `BTCUSDT` Binance, `EURUSD` → `EURUSD=X` Yahoo)
      * [x] Détecter classe d’actif (equity/etf/index/fx/crypto)
    * [x] `lib/finance/validate.ts`

      * [x] `zod` schemas pour params tools (`timeframe`, `interval`, `range`, `date`)
* [x] **Recherche symboles (sans clé)**

  * **Fichiers**:

    * [x] `lib/finance/search.ts`

      * [x] `searchYahoo(query)` (fallback DOM scrape page résultats)
      * [x] Fallback minimal local (liste top symbols) si rate limit

---

## 9) Sécurité, quotas, erreurs

* [x] **Server-only scrapers**

  * **Fichiers**:

    * [x] `app/(chat)/api/finance/*` → `runtime='nodejs'`
* [x] **Rate limit & cache** (déjà 2)
* [x] **Sanitization & erreurs UX**

  * **Fichiers**:

    * [x] `lib/finance/errors.ts`

      * [x] Types d’erreurs (`DataSourceError`, `ParseError`, `RateLimitedError`)
    * [x] UI toast

      * [x] `components/toast.tsx` (déjà présent) → messages dédiés finance

---

## 10) Tests (unit & e2e)

* [x] **Unit scrapers**

  * **Fichiers**:

    * [x] `tests/finance/yahoo.test.ts` (mocks HTML/JSON)
    * [x] `tests/finance/stooq.test.ts`
    * [x] `tests/finance/binance.test.ts`
    * [x] `tests/finance/sec.test.ts`
* [x] **Unit analytics**

  * **Fichiers**:

    * [x] `tests/finance/indicators.test.ts`
    * [x] `tests/finance/risk.test.ts`
    * [x] `tests/finance/strategies.test.ts`
* [x] **Unit utilitaires**

  * **Fichiers**:

    * [x] `tests/finance/cache.test.ts`
    * [x] `tests/finance/rate-limit.test.ts`
* [x] **Tools & API**

  * **Fichiers**:

    * [x] `tests/finance/tools-finance.test.ts`
    * [x] `tests/api/finance/*.test.ts`
* [x] **E2E Playwright**

  * **Fichiers**:

    * [x] `tests/e2e/finance.spec.ts`

      * [x] Cas : demander “Affiche AAPL en 1D + RSI”, l’agent appelle `ui.show_chart` puis `ui.add_annotation`, cartes d’analyse visibles, persistance ok

---

## 11) Intégrations dans fichiers existants (diffs ciblés)

* [x] **`app/(chat)/api/chat/route.ts`**

  * [x] Importer `tools-finance.ts`
  * [x] Étendre `tools: { ... }` avec `finance.*`, `ui.*`, `research.*`
  * [x] À chaque retour tool:

    * [x] Persister via `saveAnalysis`/`saveAttentionMarker`/`createResearch`
    * [x] Émettre évènement UI (si `ui.*`)
  * [x] Gérer erreurs via `ChatSDKError` custom “finance:*”
* [x] **`lib/ai/prompts.ts`**

  * [x] Ajouter sections “Finance Tools Usage”
  * [x] Ajouter “UI Interaction Guidelines” (toujours préciser symbole + timeframe + objectif)
  * [x] Clause “données publiques / pas de conseil”
* [x] **`lib/db/queries.ts`**

  * [x] Ajouter nouvelles fonctions (analysis/research/attention)
  * [x] Vérifier index & tri (`desc(createdAt)`)
* [x] **`components/toolbar.tsx`**

  * [x] Boutons “Mode Finance”, templates d’actions (ex: “Scanner opportunités FX”, “Deep dive AAPL”)
* [x] **`app/(chat)/layout.tsx` / `page.tsx`**

  * [x] Zone latérale ou onglet “Finance”
  * [x] Hydratation initiale des `attentionMarker` par chat/symbol

---

## 12) UX polissage

* [x] **Skeletons/Loaders**

  * **Fichiers**:

    * [x] `components/finance/ChartSkeleton.tsx`
    * [x] `components/finance/research/ResearchSkeleton.tsx`
* [x] **Empty states**

  * [x] Messages guidés “Demandez: *Affiche EURUSD en 1H et ajoute RSI*”
* [x] **Timezones & market status**

  * **Fichiers**:

    * [x] `lib/finance/time.ts` (mapping user TZ → échelles chart)
* [x] **Symbol chips & recent**

  * **Fichiers**:

    * [x] `components/finance/SymbolRecent.tsx` (raccourcis)

---

## 13) Stratégies d’analyse (contenu des docs)

* [x] **Opportunity scan**

  * [x] Sur univers configurable (majors FX, top equities), critères : volatilité > x, breakout BB, MA cross
* [x] **Asset deep dive**

  * [x] Profil société (EDGAR), fondamentaux clés (TTM revenue/EPS, margins), dernières filings, news résumées
* [x] **FT report**

  * [x] Chart (timeframe demandé), indicateurs cochés, stratégie candidate (avec règles), risques associés
* [x] **General research**

  * [x] Plan libre mais sections minimales (contexte, données, insight, risques)

---

## 14) Documentation développeur

* [x] **`AGENTS.md`**

  * [x] Ajouter spécifications détaillées des **tools** (arguments, réponses, exemples)
* [x] **`README.md`**

  * [x] Démarrage, limites, sources publiques, légal
* [x] **`app/(auth)/auth.ts`**

  * [x] Rappeler limites pour “guest” (peut limiter scans coûteux)

---

# Détails par fichiers (créations & modifications)

### **Nouveaux fichiers**

* `lib/finance/sources/yahoo.ts` — fetch quote/ohlc/search (Yahoo)
* `lib/finance/sources/stooq.ts` — daily OHLC CSV
* `lib/finance/sources/binance.ts` — klines crypto
* `lib/finance/sources/sec.ts` — filings + companyfacts
* `lib/finance/sources/news.ts` — RSS agrégé
* `lib/finance/cache.ts` — LRU/TTL
* `lib/finance/rate-limit.ts` — primitives RL
* `lib/finance/indicators.ts` — SMA/EMA/RSI/MACD/BB/ATR/Stoch
* `lib/finance/risk.ts` — vol, drawdown, Sharpe/Sortino, beta
* `lib/finance/strategies.ts` — signaux simples
* `lib/finance/symbols.ts` — normalisation symboles
* `lib/finance/validate.ts` — schémas `zod`
* `lib/ui/events.ts` — bus événements UI (option SSE interne)
* `lib/ai/tools-finance.ts` — **tous les tools** `finance.*`, `ui.*`, `research.*`
* `app/(chat)/api/finance/quote/route.ts` — GET quote
* `app/(chat)/api/finance/ohlc/route.ts` — GET ohlc
* `app/(chat)/api/finance/fundamentals/route.ts` — GET fondamentaux
* `app/(chat)/api/finance/filings/route.ts` — GET filings
* `app/(chat)/api/finance/news/route.ts` — GET news
* `app/(chat)/api/finance/attention/route.ts` — CRUD annotations
* `app/(chat)/api/finance/research/route.ts` — CRUD research docs
* `components/finance/ChartPanel.tsx` — chart interactif (lightweight-charts)
* `components/finance/ChartToolbar.tsx` — contrôles chart
* `components/finance/AttentionLayer.tsx` — overlay annotations
* `components/finance/research/ResearchDoc.tsx` — render doc
* `components/finance/research/ResearchList.tsx` — liste docs

### **Fichiers modifiés**

* `package.json` — deps ajoutées
* `lib/db/schema.ts` — tables `analysis`, `research`, `attentionMarker`
* `lib/db/migrate.ts` — migrations
* `lib/db/queries.ts` — nouvelles fonctions CRUD
* `lib/ai/prompts.ts` — section “Finance” + directives UI
* `app/(chat)/api/chat/route.ts` — `tools: { ... }` étendu + persistance + events
* `app/(chat)/page.tsx` & `app/(chat)/[id]/page.tsx` — panneau Finance, wiring events
* `components/toolbar.tsx` — raccourcis finance (suggestions)
* `README.md` & `AGENTS.md` — docs

---

# Objectifs attendus & correctifs

* **Données temps réel ou quasi temps réel** via **Yahoo/Binance** (sans clé) + **fallback** Stooq (daily) pour robustesse.
* **Analyses techniques & risques** calculées **localement** (pas de dépendance externe).
* **Fondamentaux & filings** via **SEC/EDGAR** (public), ratios calculés localement.
* **News** via **RSS** publics, résumées par LLM si demandé.
* **Charts interactifs** : ajout d’overlays/studies/annotations, focus d’une zone, contrôlé par **tools UI**.
* **Agent** capable de :

  * afficher un **graphique précis** (symbole + timeframe),
  * **ajouter des éléments d’attention/commentaires**,
  * lancer des **recherches** (opportunités, deep-dive, FT report, général) et **persister** ces documents.
* **Ergonomie** : toasts d’erreur explicites, loaders, empty states guidants.
* **Robustesse** : cache + rate limit, normalisation symboles, gestion edge cases (jours non ouvrés, symboles exotiques).
* **Tests** solides (scrapers, indicateurs, tools, e2e scénario complet).

---

# Petites améliorations incluses

* Normalisation symboles multi-classes (equity/index/FX/crypto) → **moins d’erreurs agent**.
* Mapping timeframes → intervals OHLC + **TZ utilisateur** correctement respectée.
* Persistance annotations → **mémoire visuelle** par chat/symbole.
* Raccourcis UI (“chips” de symboles récents, toggles d’indicateurs usuels).
* Rate limiting par domaine pour éviter les blocages scraping.

---

Quand tu valides, je peux commencer par le **lot 1 (sources + indicators + tools de base + ChartPanel)** puis itérer vers **recherches** et **UI avancée**.

## Tool specifications

### `finance.get_quote`
- **Args:** `{ symbol: string }`
- **Returns:** `{ symbol: string, price: number, currency: string }`
- **Example:** `finance.get_quote({ symbol: 'AAPL' })`

### `finance.get_ohlc`
- **Args:** `{ symbol: string, timeframe: string, range?: string }`
- **Returns:** `{ symbol: string, candles: Array<{ time: number, open: number, high: number, low: number, close: number }> }`
- **Example:** `finance.get_ohlc({ symbol: 'EURUSD', timeframe: '1h', range: '1d' })`

### `finance.search_symbol`
- **Args:** `{ query: string }`
- **Returns:** `{ results: Array<{ symbol: string, name: string }> }`
- **Example:** `finance.search_symbol({ query: 'AAPL' })`

### `finance.compute_indicators`
- **Args:** `{ ohlc: Candle[], list: string[] }`
- **Returns:** `{ indicators: Record<string, any> }`
- **Example:** `finance.compute_indicators({ ohlc, list: ['sma', 'rsi'] })`

### `finance.news`
- **Args:** `{ symbol?: string, query?: string, window?: string }`
- **Returns:** `{ items: Array<{ title: string, link: string, pubDate: string }> }`
- **Example:** `finance.news({ symbol: 'TSLA', window: '1d' })`

### `ui.show_chart`
- **Args:** `{ symbol: string, timeframe: string, range?: string }`
- **Effect:** émet un évènement UI pour afficher un graphique
- **Example:** `ui.show_chart({ symbol: 'AAPL', timeframe: '1d' })`

### `ui.add_annotation`
- **Args:** `{ symbol: string, timeframe: string, at: number, type: string, text?: string }`
- **Returns:** `{ id: string }`
- **Example:** `ui.add_annotation({ symbol: 'AAPL', timeframe: '1d', at: 1700000000, type: 'note', text: 'Breakout' })`

### `research.create`
- **Args:** `{ kind: 'opportunity'|'asset_deep_dive'|'ft_report'|'general', title: string }`
- **Returns:** `{ id: string }`
- **Example:** `research.create({ kind: 'general', title: 'Etude EURUSD' })`

## Info
- Aucune donnée sensible, sources publiques uniquement.
- Objectif: intégrer un agent d’analyse financière avec charts interactifs.

## History
- Ajout des dépendances `lightweight-charts`, `undici` et `cheerio` dans `package.json` ; ajout d'une clause d'usage dans `README.md` ; installation des packages et exécution des tests.
- Création des tables `analysis`, `research` et `attentionMarker` avec migrations et helpers de persistance ; ajout d'un test basique des helpers ; tentative d'installation des dépendances Playwright.
- Ajout des modules `cache` et `rate-limit` pour la gestion des requêtes ; implémentation des scrapers Yahoo Finance (`fetchQuoteYahoo`, `fetchOHLCYahoo`, `searchYahoo`) avec support des cookies/crumb et normalisation des symboles ; création de tests unitaires correspondants.
- Implémentation des scrapers Stooq et Binance avec mise en cache et rate limiting ; déplacement des tests Yahoo vers `tests/finance` et ajout des tests unitaires Stooq et Binance ; configuration d'un projet Playwright dédié.
- Ajout du module `indicators` (SMA, EMA, RSI, MACD, Bollinger, ATR, Stochastic) avec validation `zod` et tests unitaires.
- Implémentation du module `risk` (volatilité annualisée, drawdown max, Sharpe, Sortino, beta) et ajout des tests unitaires associés.
- Implémentation des utilitaires de normalisation des symboles et de validation des paramètres (`symbols.ts`, `validate.ts`) avec tests unitaires.
- Implémentation du module `strategies` (maCrossover, rsiReversion, breakoutBB) avec backtest naïf et tests unitaires.
- Ajout du module `news` pour agréger les flux RSS Yahoo/Reuters/Nasdaq et tests unitaires associés.
- Implémentation du module `sec` pour récupérer les CIK, lister les filings, extraire le texte des documents et parser les indicateurs fondamentaux via l'API companyfacts ; ajout des tests unitaires correspondants.
- Création du paquet `tools-finance` avec les tools `get_quote`, `get_ohlc`, `search_symbol`, `compute_indicators` et `compute_risk`; ajout des tests unitaires associés.
- Introduction d'un bus d'évènements UI (`lib/ui/events.ts`) permettant d'émettre et souscrire à des actions côté client ; ajout d'un test unitaire vérifiant la réception des évènements.
- Extension du paquet `tools-finance` avec `get_fundamentals`, `get_filings` et `news`; ajout de tests unitaires couvrant ces tools.
- Création de l'endpoint `/api/finance/quote` avec cache, fallback Binance et `runtime='nodejs'`; ajout de tests API simulant les réponses Yahoo et Binance.
- Implémentation de l'endpoint `/api/finance/ohlc` avec fallback Stooq/Binance et tests API couvrant les scénarios de repli.
- Création des endpoints `/api/finance/fundamentals`, `/api/finance/filings` et `/api/finance/news` avec mise en cache et tests
unitaires simulant les réponses SEC et RSS.
- Ajout des endpoints `/api/finance/attention` et `/api/finance/research` pour gérer annotations et documents de recherche, avec tests API et suppression des marqueurs côté base de données.
- Ajout des tools UI (`show_chart`, `add_annotation`, `remove_annotation`, `focus_area`) et des tools de recherche (`create`, `add_section`, `update_section`, `finalize`) avec persistance et évènements ; adaptation de l'API d'attention pour retourner l'identifiant des marqueurs et mise à jour des tests.
- Ajout du module `search` avec repli HTML et liste locale pour la recherche de symboles ; mise à jour du tool `search_symbol` et ajout de tests unitaires dédiés.
- Intégration des tools finance dans la route chat avec préfixe de noms, gestion d'erreurs `ChatSDKError` et ajout d'un bloc de prompt détaillant les capacités finance et les avertissements légaux.
- Ajout des classes d'erreurs `DataSourceError`, `ParseError` et `RateLimitedError` avec intégration dans le cache et le rate limiter, accompagnées de tests unitaires dédiés.
- Implémentation du module `time` pour la gestion des fuseaux horaires et l'état d'ouverture du marché, avec tests unitaires ; mise à jour de la feuille de route (import des tools, prompts, endpoints).
- Ajout de `toastFinanceError` mappant les erreurs financières vers des messages utilisateurs et tests couvrant les cas de rate limit, source distante et parsing.
- Création du composant `ChartPanel` utilisant `lightweight-charts` avec méthodes `setData` et `focusArea`, accompagné d'un test unitaire.
- Ajout du composant `ChartToolbar` offrant la sélection de timeframe, de type de série et le basculement d'indicateurs ; tests Node pour ChartPanel et ChartToolbar validant les callbacks.
- Ajout des composants `ChartSkeleton` et `ResearchSkeleton` pour fournir des loaders visuels avec tests Node validant leur rendu.
- Implémentation du composant `AttentionLayer` affichant des marqueurs cliquables sur le graphique et tests assurant leur ajout, interaction et suppression via le bus d'évènements.
- Extension du `ChartPanel` avec support des overlays/études/annotations, gestion du thème et émission d'évènements de crosshair ; ajout d'un test unitaire validant overlay et émission d'évènement.
- Création des composants `ResearchDoc` et `ResearchList` pour afficher et lister les documents de recherche ; ajout de directives de structuration dans `financePrompt` et tests unitaires associés.
- Intégration d'un panneau latéral Finance réactif aux évènements `show_chart` et ajout d'actions rapides "Afficher AAPL 1D" et "Scanner opportunités FX" dans la toolbar avec tests.
- Hydratation des marqueurs d'attention existants lors de l'affichage d'un graphique et ajout du composant `SymbolRecent` pour accéder aux symboles récemment consultés.
- Persistance côté client des annotations sans identifiant via `AttentionLayer` et passage de `userId` au `FinancePanel`, avec tests unitaires mis à jour.
- Ajout d'un composant `FinanceHint` guidant l'utilisateur (“Affiche EURUSD en 1H et ajoute RSI”) et masqué après `show_chart`, intégré aux pages de chat avec tests unitaires.
- Documentation des tools (arguments, réponses, exemples) et rappel des limites invitées ; enrichissement du README avec sources publiques, limites d'usage et mentions légales.
- Implémentation d'une fonction `opportunityScan` analysant un univers de prix et détectant volatilité élevée, cassure de Bollinger ou croisement de moyennes mobiles ; ajout de tests unitaires associés.
- Ajout d'un agrégateur `assetDeepDive` combinant fondamentaux SEC, filings récents et flux RSS pour un ticker donné, avec test unitaire utilisant des réponses mockées.
- Ajout d'un agrégateur `ftReport` combinant indicateurs techniques, stratégie de croisement de moyennes mobiles et métriques de risque, avec test unitaire associé.
- Ajout d'un agrégateur `generalResearch` récupérant un cours et des gros titres récents pour amorcer une recherche libre, avec test unitaire validant la collecte des données.
- Ajout d'un test E2E Playwright simulant `ui.show_chart` suivi d'`ui.add_annotation` et configuration Playwright légère sans serveur.
- Alignement du tool `finance.get_ohlc` pour accepter `timeframe` au lieu de `interval`, avec tests mis à jour.
 - Ajout de tests unitaires pour les utilitaires `cache` et `rate-limit` afin de valider l'expiration des données et la gestion des quotas.
- Installation des dépendances manquantes et exécution du test `news` pour valider l'agrégateur RSS.
- Installation effective des packages `cheerio`, `lightweight-charts` et `undici` dans le workspace, puis exécution réussie des tests `tools-finance`.
