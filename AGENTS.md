Parfait, on repart de la **version actuelle (v3)** et on te prépare une **checklist exhaustive à cocher** pour implémenter *tous* les points pertinents (y compris les petites améliorations), **fichier par fichier**, en restant **FR/EN** (bilingue) et **sources publiques sans clé** / **scrapers maison**.

> Nota bene (audit v3) : deux points à corriger en priorité
> • Injection des tools `strategy.*` manquante dans `app/(chat)/api/chat/route.ts`
> • 4 tests unitaires de tuiles dashboard manquants (`tests/dashboard/*.test.tsx`)

---

# ✅ Correctifs immédiats (avant d’étendre)

* [x] **Exposer `strategy.*` dans la route chat**
  **Fichier** : `app/(chat)/api/chat/route.ts`

  * [x] Déstructurer `strategy: strategyTools` depuis `createFinanceTools(...)`
  * [x] Ajouter `...prefixTools('strategy', strategyTools as Record<string, Tool>)` au `financeToolMap`
    **Objectif** : rendre accessibles `strategy.start_wizard/propose/backtest/refine/finalize/list/get` côté LLM.
    **Critère** : `experimental_activeTools` inclut bien les clés `strategy.*` (via `Object.keys(financeToolMap)`).

* [x] **Ajouter les tests unitaires des tuiles Dashboard**
  **Fichiers (nouveaux)** :

  * [x] `tests/dashboard/prices-tile.test.tsx`
  * [x] `tests/dashboard/news-tile.test.tsx`
  * [x] `tests/dashboard/strategies-tile.test.tsx`
  * [x] `tests/dashboard/analyses-tile.test.tsx`
    **Objectif** : valider rendu (loading/data/error), états vides, pagination/filtres.
    **Critère** : `pnpm test` → green.

---

# 🧩 I18N complet FR/EN (App Router)

## 1) Infra i18n

* [x] **Installer i18n (sans clé, lib publique)**
  **Fichier** : `package.json`

  * [x] Ajouter `next-intl` (ou équivalent App Router-friendly).
    **Objectif** : localisation FR/EN côté serveur et client.

* [x] **Middlewares & config**
  **Fichiers (nouveaux)** :

  * [x] `middleware.ts` — détection locale (`/fr`, `/en`) + redirection propre.
  * [x] `i18n/config.ts` — locales supportées (`['fr','en']`), locale par défaut (`'fr'`).
    **Objectif** : URL propres type `/fr/...`, `/en/...`.

* [x] **Dictionnaires**
  **Fichiers (nouveaux)** :

  * [x] `messages/fr/dashboard.json`
  * [x] `messages/en/dashboard.json`
  * [x] `messages/fr/finance.json`
  * [x] `messages/en/finance.json`
  * [x] `messages/fr/common.json`
  * [x] `messages/en/common.json`
    **Objectif** : traduire titres/labels (Dashboard, tuiles, toolbar, prompts UI).

* [x] **Provider App**
  **Fichier (modif)** : `app/layout.tsx`

  * [x] Envelopper avec le provider i18n, charger messages selon `locale`.
    **Objectif** : `t('key')` utilisable partout.

* [x] **Sélecteur de langue**
  **Fichiers (nouveaux)** :

  * [x] `components/i18n/LanguageSwitcher.tsx` — switch FR ↔ EN.
  * [x] Intégration dans `app/page.tsx` (bento header).
    **Objectif** : bascule instantanée, persistance par URL.

* [x] **Tests i18n**
  **Fichier (nouveau)** : `tests/i18n/i18n-routing.test.ts`
  **Objectif** : `/` → `/fr`, `/en/page` charge EN, formats `Intl.DateTimeFormat` ok.

---

# 🏠 Dashboard Bento (accueil)

## 2) Structure & layout

* [x] **BentoGrid & BentoCard** *(déjà présents)*
  **Fichiers (modif)** :

  * [x] `components/dashboard/BentoGrid.tsx`
  * [x] `components/dashboard/BentoCard.tsx`
    **Objectif** : ajouter props `title`, `actions`, `aria-labelledby`; traduire titres via `t('...')`.
    **Critère** : responsive 2–4 colonnes, A11y OK.

* [x] **Page d’accueil**
  **Fichier (modif)** : `app/page.tsx`

  * [x] Charger données initiales (SSR) pour **Prices** (symbols récents/favoris) + **News** (flux par défaut).
  * [x] Injecter `LanguageSwitcher`.
    **Objectif** : first contentful paint utile.

## 3) Tuile “Cours actuels”

* [x] **CurrentPricesTile** *(existe)*
  **Fichier (modif)** : `components/dashboard/tiles/CurrentPricesTile.tsx`

  * [x] Utiliser `t('prices.title')`, unité locale, format nombres `Intl.NumberFormat`.
  * [x] Polling serveur via `app/(chat)/api/finance/quote/route.ts` (TTL 10–15s).
  * [x] Si crypto, WebSocket Binance côté client (fallback polling).
    **Objectif** : données quasi-temps-réel **sans clé**.
    **Tests** : `tests/dashboard/prices-tile.test.tsx`.

## 4) Tuile “Dernières news”

* [x] **NewsTile** *(existe)*
  **Fichier (modif)** : `components/dashboard/tiles/NewsTile.tsx`

  * [x] Récup via `app/(chat)/api/finance/news/route.ts`.
  * [x] Sanitize `description` (cheerio/DOMPurify côté client si besoin).
  * [x] Labels traduits ; dates relatives via `Intl.RelativeTimeFormat`.
    **Tests** : `tests/dashboard/news-tile.test.tsx`.

## 5) Tuile “Mes stratégies”

* [x] **StrategiesTile** *(existe)*
  **Fichier (modif)** : `components/dashboard/tiles/StrategiesTile.tsx`

  * [x] Lister par `chatId`, statut `draft/proposed/validated`, liens vers détail.
  * [x] Bouton “Créer une stratégie” → **StrategyWizard**.
    **Tests** : `tests/dashboard/strategies-tile.test.tsx`.

* [x] **StrategyWizard**
  **Fichier (modif)** : `components/finance/StrategyWizard.tsx`

  * [x] Questions **bilingues** (`t('wizard.horizon')` …).
  * [x] Appel tool `strategy.start_wizard` puis `strategy.propose`.
    **Objectif** : collecte contraintes utilisateur **FR/EN**.

* [x] **StrategyCard & BacktestReport**
  **Fichiers (modif)** :

  * [x] `components/finance/StrategyCard.tsx` — actions `Backtest`, `Refine`, `Finalize`.
  * [x] `components/finance/BacktestReport.tsx` — metrics (CAGR, Sharpe, Sortino, MDD…), equity curve (lightweight-charts).
    **Objectif** : lisibilité + t().

## 6) Tuile “Mes analyses”

* [x] **AnalysesTile** *(existe)*
  **Fichier (modif)** : `components/dashboard/tiles/AnalysesTile.tsx`

  * [x] Lister `Analysis` & `Research` par `chatId` (via `queries.ts`).
  * [x] Filtres (type, symbole), liens vers chat d’origine `/chat/[id]`.
    **Tests** : `tests/dashboard/analyses-tile.test.tsx`.

## 7) Tuile “Menu” (non superposée)

* [x] **MenuTile** *(existe)*
  **Fichier (modif)** : `components/dashboard/tiles/MenuTile.tsx`

  * [x] Reprendre items `financeToolbarItems` **dans la tuile**.
  * [x] Supprimer overlay global.
    **Fichier (modif)** : `components/toolbar.tsx`
  * [x] Retirer styles `position: fixed`, `backdrop`, `z-index` élevés.
    **Tests** : inclure dans `tests/e2e/dashboard.spec.ts`.

---

# 🤖 Tools IA & prompts (bilingues)

## 8) Tools mapping & validation

* [x] **Route Chat**
  **Fichier (modif)** : `app/(chat)/api/chat/route.ts`

  * [x] ✅ Intégrer `strategyTools` (voir “Correctifs immédiats”).
  * [x] Confirmer `experimental_activeTools` alimenté par `Object.keys(financeToolMap)`.
    **Objectif** : tous les tools disponibles, nommés `finance.* / ui.* / research.* / strategy.*`.

* [x] **Validation d’entrées**
  **Fichier (modif)** : `lib/ai/tools-finance.ts`

  * [x] `zod` schema multilingue : les textes utilisateurs restent libres, mais tool args stricts.
    **Objectif** : robustesse aux prompts FR/EN.

## 9) Prompts système FR/EN

* [x] **Prompts**
  **Fichier (modif)** : `lib/ai/prompts.ts`

  * [x] Ajouter un **bloc FR** parallèle au bloc EN :

    * “Les données sont **publiques** et **non garanties** (scraping Yahoo/SEC/RSS). **Pas un conseil en investissement.**”
    * “Toujours préciser **timeframe** avant `ui.show_chart`.”
    * “Utiliser `compute_indicators` pour l’analyse technique.”
    * “Structurer les documents : **Résumé, Contexte, Données, Graphiques, Signaux, Risques, Sources**.”
  * [x] Injecter `locale` dans le `systemPrompt({ selectedChatModel, requestHints, locale })` (si non présent : adapter signature).
    **Objectif** : consignes claires **dans la langue de l’UI**.

* [x] **Tests prompts**
  **Fichier (nouveau)** : `tests/ai/prompts-i18n.test.ts`
  **Objectif** : vérifier présence disclaimers & sections en FR/EN.

---

# 📊 Données publiques & Scrapers

## 10) Timeouts, retries, fallback

* [x] **Sources**
  **Fichiers (modif)** :

  * [x] `lib/finance/sources/{yahoo.ts, stooq.ts, binance.ts, sec.ts, news.ts}`
  * [x] Ajouter `AbortController` + timeout 10s, retries 2× (expo backoff), chaînes de **fallback** :

    * OHLC : Yahoo → Stooq (daily) → message explicite.
    * Crypto : Binance WS → REST klines.
      **Objectif** : **zéro** clé API, robustesse réseau.

* [x] **Cache & rate-limit**
  **Fichiers (modif)** :

  * [x] `lib/finance/cache.ts` — TTL intraday 10–15s, daily 5–10 min.
  * [x] `lib/finance/rate-limit.ts` — bucket par domaine (Yahoo, SEC…).
    **Tests** : `tests/finance/{yahoo.test.ts, stooq.test.ts, sec.test.ts}`.

---

# 🧠 Stratégies (boucle agent & backtest)

## 11) DB & queries (déjà présentes, vérifier)

* [x] **Schéma**
  **Fichier (check/modif)** : `lib/db/schema.ts`

  * [x] Tables **Strategy**, **StrategyVersion**, **StrategyBacktest** complètes.
* [x] **Queries**
  **Fichier (modif)** : `lib/db/queries.ts`

  * [x] `createStrategy`, `listStrategiesByChat`, `getStrategyById`, `createStrategyVersion`, `saveBacktest` (déjà là), ajouter `updateStrategyStatus` si manquant.
    **Tests** : `tests/api/finance/strategy.test.ts`.

## 12) Backtest engine

* [x] **Moteur**
  **Fichier (modif)** : `lib/finance/backtest.ts`

  * [x] Bar-by-bar, coûts & slippage, equity curve.
  * [x] Metrics : CAGR, Sharpe, Sortino, MDD, Profit Factor, Hit-rate.
    **Tests** : `tests/finance/backtest.test.ts`.

## 13) Tools `strategy.*` (déjà présents)

* [x] **Wizard → propose → backtest → refine → finalize**
  **Fichier (modif)** : `lib/ai/tools-finance.ts`

  * [x] Vérifier messages de retour **bilingues** (titres/notes) en fonction de `locale` (passée via contexte si nécessaire).
  * [x] Journaliser via `persistAnalysis('strategy_*', ...)`.
    **E2E** : `tests/e2e/strategy-wizard.spec.ts`.

---

# 🧷 Menu & Toolbar (tuile, pas overlay)

## 14) Toolbar → tuile

* [x] **MenuTile**
  **Fichier (modif)** : `components/dashboard/tiles/MenuTile.tsx`

  * [x] Utiliser `financeToolbarItems` (déjà présent `components/finance/toolbar-items.tsx`).
* [x] **Toolbar overlay cleanup**
  **Fichier (modif)** : `components/toolbar.tsx`

  * [x] Retirer styles overlay (`position: fixed`, `backdrop`, `z-index` élevés`).
    **E2E** : `tests/e2e/dashboard.spec.ts` (vérifier absence overlay).

---

# 🧪 Tests complémentaires & CI

## 15) API & tools

* [x] **tools-finance.strategy**
  **Fichier (nouveau)** : `tests/ai/tools-finance.strategy.test.ts`

  * [x] Mock `persistAnalysis` & `emitUIEvent` ; valider transitions (wizard → propose → backtest → refine → finalize).

* [x] **Dashboard E2E**
  **Fichier (nouveau)** : `tests/e2e/dashboard.test.ts`

  * [x] Parcours : affichage bento, bascule FR/EN, open stratégie, voir analyses.

## 16) Qualité & a11y

* [x] **Skeletons/Empty states**
  **Fichiers (nouveaux)** : `components/dashboard/skeletons/*.tsx`, `components/dashboard/empty/*.tsx`
  **Objectif** : UX fluide.
* [x] **A11y** :
  **Fichiers (modif)** : toutes les tuiles — `aria-label`, `aria-labelledby`, focus visible.

---

# 📚 Documentation

## 17) AGENTS & README

* [x] **AGENTS.md**
  **Fichier (modif)** : specs mises à jour pour `strategy.*`, `ui.*`, `research.*`, formats E/S, exemples FR/EN.
* [x] **README.md**
  **Fichier (modif)** :

  * [x] Captures dashboard, note **“données publiques, non garanties, pas de conseil en investissement”**.
  * [x] i18n : comment changer la langue (URL/switcher).
  * [x] Limites scraping et rate limits.

---

## Critères d’acceptation (résumé)

* Le **dashboard** `/` affiche **Prices**, **News**, **Mes stratégies**, **Mes analyses**, et un **Menu** sous forme **de tuile** (non superposée).
* L’**agent** peut **poser les questions** (FR/EN), **proposer**, **backtester**, **affiner**, **finaliser** une stratégie, et **persister** versions/backtests.
* Les **prompts** et **UI** sont **bilingues FR/EN**, avec disclaimers explicites.
* **Aucune clé API** ; uniquement **Yahoo/SEC/RSS/Binance public** + **analyse locale**.
* **Tests** : unitaires/API/E2E **verts** (incluant les 4 tuiles manquantes).

---

Si tu veux, je te fournis ensuite des **squelettes** prêts à coller pour :

* le patch `route.ts` (strategy prefix),
* les 4 tests de tuiles,
* l’infra i18n minimale (config + provider + messages FR/EN + switcher).

## Specs

### strategy.*
- **Entrée** : paramètres stricts (`symbolSet`, `constraints`, `rules`...).
- **Sortie** : objets `Strategy`, `StrategyVersion`, `StrategyBacktest` stockés en base.
- **Exemple EN** : “Start a strategy wizard for AAPL.”
- **Exemple FR** : « Lance l’assistant de stratégie pour AAPL. »

### ui.*
- **Entrée** : texte libre décrivant l’action. Mentionner toujours la **timeframe** avant `ui.show_chart`.
- **Sortie** : évènements UI (ex : affichage d’un graphique ou d’une table).
- **Exemple EN** : “show a daily chart of EURUSD.”
- **Exemple FR** : « affiche un graphique quotidien de EURUSD. »

### research.*
- **Entrée** : symbole ou sujet de recherche.
- **Sortie** : analyses `Research` persistées avec sections JSON.
- **Exemple EN** : “Research latest filings for TSLA.”
- **Exemple FR** : « Analyse les dernières publications de TSLA. »

## Info
- Aucune donnée sensible, sources publiques sans clé, scrapers maison.

## History
- Stubbed `next-intl` for server-side tests, documented tool specs, updated DB query tasks, and refreshed README with i18n and data disclaimers.
- Reset AGENTS.md with provided tasks; no tasks completed yet.
- Exposed strategy tools in chat route and added dashboard tile tests; attempted test runs (Playwright tests failing).
- Introduced initial i18n infrastructure (next-intl, config, messages, language switcher) and ignored dashboard unit tests in Playwright.
- Added locale-aware middleware, wrapped app with NextIntl provider, and created routing tests; unit tests green, Playwright still failing (React child error).
- Added a11y props to Bento components, localized CurrentPricesTile with next-intl, expanded dictionaries, and updated tests; unit tests pass, Playwright still fails (React child error).
- Localised News tile with translations and relative time formatting; installed missing next-intl package and ensured dashboard tests pass; Playwright tests still failing with React child error.
- Prefetched prices and news in home page, wired tiles to accept data via props, updated tests; Playwright tests still failing (React child error).
- Localised strategies tile, wizard, and card; added FR/EN messages and updated unit tests accordingly.
- Localised analyses tile with translations, relative timestamps, and filter labels; expanded dictionaries and updated unit tests.
- Excluded node-only tests from Playwright to resolve React child errors, added a menu tile E2E test, installed `next-intl` dependency, and verified dashboard tile unit tests pass.
- Added bilingual finance/system prompts with locale-aware systemPrompt and created tests ensuring disclaimers exist in FR/EN; unit test run failing due to missing next-intl modules.
- Passed locale header to chat route tools and system prompt, localized strategy wizard questions and descriptions, persisted strategy operations, tightened zod schemas, and expanded strategy tool tests with localization coverage.
- Localized the dashboard menu tile, refactored finance toolbar items into a locale-aware hook, removed the floating overlay toolbar, and updated translations, tests, and E2E coverage accordingly.
- Installed missing `next-intl` dependency, expanded dashboard E2E test to cover FR/EN switching and strategy wizard, and ensured unit and Playwright suites pass.
- Added `aria-labelledby` ids and focus-visible styles across dashboard tiles, switched server translations to dynamic imports, installed `next-intl`, and verified unit/E2E tests pass.
- Added wizard endpoint invoking `strategy.start_wizard` and `strategy.propose`, localized backtest report metrics with FR/EN labels, updated tests, and confirmed all suites pass.
- Hardened public data fetchers with a 10s timeout, retry/backoff strategy, and explicit Stooq/Binance fallbacks; documented cache TTL ranges and verified finance source tests.
- Verified `pnpm test` runs cleanly with 76 passing checks and no React rendering errors.
- Re-ran full test suite (`pnpm test`): 75 passed, 34 skipped; confirmed dashboard tile tests and strategy tool exposure work end-to-end.
