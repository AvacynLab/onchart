Parfait. Voici la **checklist exhaustive et cochable**, **fichier par fichier**, qui combine :

1. ce que la **version actuelle (v2)** démontre,
2. les **écarts détectés** (notamment i18n/`next-intl` et `tools-finance`),
3. toutes les **améliorations fonctionnelles** (agent FT, dashboard bento, scrapers publics, backtest, A11y, tests & CI).

> Contraintes constantes : **FR/EN**, **zéro clé API**, uniquement **sources publiques** (Yahoo/Stooq/Binance websockets/REST publics, SEC/EDGAR, RSS) + **scrapers maison**.

---

# 0) Garde-fous & critères d’acceptation (globaux)

* [ ] **Public-only** : aucune clé/token, pas de tier privé.
  **Critères** : scan repo → 0 motif `api[_-]?key|x-api-key|bearer`.
* [ ] **Build & tests** : `pnpm build` OK, `pnpm test` OK (unit, API, AI/tools, E2E).
* [ ] **FR/EN** 100% (middleware + provider + messages + formats Intl).
* [ ] **Menu** = **tuile bento** (pas d’overlay global).
* [ ] **Agent** opère FT (fondamental/technique), sait **afficher un graphique/timeframe**, **ajouter/focus annotations**, **conduire un wizard stratégie + backtests + itérations**.

---

# 1) i18n & Next-intl (bloquant Playwright si incomplet)

## 1.1 `next-intl.config.ts` (racine)

* [ ] Créer/vérifier qu’il **existe** et **exporte** statiquement :

  * [ ] `locales: ['fr','en']`
  * [ ] `defaultLocale: 'fr'`
  * [ ] `localePrefix: 'never'`
    **Objectif** : FR et EN servis sur `/` sans préfixe.
    **Critères** : le serveur E2E **boot** (plus d’erreur “Couldn’t find next-intl config file”).

## 1.2 `middleware.ts`

* [ ] Middleware: lire `NEXT_LOCALE` (ou `Accept-Language`), setter l’en-tête `x-next-intl-locale` et passer la requête sans réécriture.
* [ ] `export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] }` (ne pas intercepter `_next`, `api`, assets).
  **Critères** : navigation stable via cookies/headers, pas d’interception indue.

## 1.3 `i18n/config.ts`

* [ ] Exporter **statique** (non dérivé dynamiquement) :

  * [ ] `export const locales = ['fr','en'] as const;`
  * [ ] `export const defaultLocale = 'fr' as const;`
    **Critères** : tests et SSR peuvent lire ces constantes sans import circulaire.

## 1.4 `app/layout.tsx`

* [ ] Envelopper l’app via le **provider next-intl**.
* [ ] Charger les `messages` selon `locale`.
  **Critères** : labels traduits, formats `Intl` alignés sur la locale.

## 1.5 Dictionnaires

* [ ] `messages/fr/common.json`, `messages/en/common.json` existants et cohérents.
* [ ] Ajouter si manquants : `messages/fr/{dashboard,finance}.json`, `messages/en/{dashboard,finance}.json`.
  **Critères** : aucune clé manquante à l’exécution (warning console interdit).

---

# 2) Route chat — exposition complète des tools

## 2.1 `app/(chat)/api/chat/route.ts`

* [ ] **Déstructurer** :

  * [ ] `const { ui: uiTools, research: researchTools, strategy: strategyTools, ...finance } = ft;`
* [ ] **Mapper** :

  * [ ] `...prefixTools('finance', finance)`
  * [ ] `...prefixTools('ui', uiTools)`
  * [ ] `...prefixTools('research', researchTools)`
  * [ ] `...prefixTools('strategy', strategyTools)`
* [ ] **Activer** (si filtrage) :

  * [ ] `experimental_activeTools: Object.keys(financeToolMap)`
    **Objectif** : rendre accessibles **finance.***, **ui.***, **research.***, **strategy.***.

---

# 3) Routes Finance — scraping côté Node

## 3.1 `app/(chat)/api/finance/**/route.ts`

* [ ] **En tête de chaque fichier** :

  * [ ] `export const runtime = 'nodejs'`
    **Objectif** : scrapers sur Node (Yahoo/SEC/RSS/Binance REST/WS).
    **Critères** : toutes les routes scannées contiennent ce flag (audit passe).

---

# 4) Tools IA — validation, persistance, UI events

## 4.1 `lib/ai/tools-finance.ts`

* [ ] **Sections présentes** et nommées **exactement** ainsi (pour matcher `prefixTools`) :

  * [ ] `finance: { get_quote, get_ohlc, compute_indicators, compute_risk, get_fundamentals, get_filings, news, search_symbol }`
  * [ ] `ui: { show_chart, add_annotation, remove_annotation, focus_area }` (doit émettre **`emitUIEvent`**)
  * [ ] `research: { create, add_section, update_section, finalize, get }`
  * [ ] `strategy: { start_wizard, propose, backtest, refine, finalize, list, get }`
* [ ] **Validation d’entrées** via **`zod`** :

  * [ ] symbol, timeframe, périodes indicateurs, params backtest (coûts, slippage), filtres filings/news, etc.
* [ ] **Persistance** via `persistAnalysis(...)` :

  * [ ] wizard / propose → trace
  * [ ] backtest (params + résultats/metrics)
  * [ ] refine (delta params + nouveaux résultats)
  * [ ] finalize (version retenue)
    **Objectif** : robustesse contre entrées invalides + traçabilité.
    **Critères** : erreurs `zod` claires, “Mes analyses/stratégies” se remplissent au fil des tools.

---

# 5) Prompts système — garde-fous FR/EN & structure

## 5.1 `lib/ai/prompts.ts`

* [ ] **FR** (textuel détectable) :

  * [ ] “Données **publiques**, **non garanties** (Yahoo/SEC/RSS). **Pas un conseil en investissement.**”
  * [ ] “Préciser la **timeframe** avant `ui.show_chart`.”
  * [ ] “Utiliser `compute_indicators` pour l’AT.”
  * [ ] “Structurer : **Résumé, Contexte, Données, Graphiques, Signaux, Risques, Sources**.”
* [ ] **EN** (miroir) :

  * [ ] “Data is **public** and **not guaranteed**. **Not financial advice.**”
  * [ ] “Specify **timeframe** before `ui.show_chart`.”
  * [ ] “Use `compute_indicators` for TA.”
  * [ ] “Structure: **Summary, Context, Data, Charts, Signals, Risks, Sources**.”
* [ ] **Locale** propagée au builder du prompt.
  **Critères** : tests `prompts-i18n` valident FR/EN.

---

# 6) Scrapers & sources publiques — robustesse réseau

## 6.1 `lib/finance/sources/{yahoo.ts,stooq.ts,binance.ts,sec.ts,news.ts}`

* [ ] **Timeout** 10s (AbortController).
* [ ] **Retries** 2× (backoff exponentiel + jitter).
* [ ] **Fallbacks** :

  * [ ] OHLC : Yahoo → Stooq (daily), message clair en dégradé.
  * [ ] Crypto : Binance **WS** → fallback **REST klines**.
* [ ] **Sanitize** (news) côté serveur si nécessaire (cheerio).
  **Critères** : tests unitaires de retry/fallback **verts** (mocks).

## 6.2 `lib/finance/cache.ts`

* [ ] TTL **intraday 10–15s**, **daily 5–10 min**.
  **Critères** : pas de spam réseau, rafraîchis prédictibles.

## 6.3 `lib/finance/rate-limit.ts`

* [ ] Rate limit par **domaine** (Yahoo/SEC…).
  **Critères** : pas de 429 lors des runs de tests.

---

# 7) Moteur d’analyse & backtest

## 7.1 `lib/finance/indicators.ts`

* [ ] RSI, SMA/EMA, MACD, ATR, Bollinger (paramétrables).
  **Critères** : valeurs testées vs cas connus.

## 7.2 `lib/finance/risk.ts`

* [ ] CAGR, Sharpe, Sortino, MDD, Profit Factor, Hit-rate ; calculs propres à la série d’équity.
  **Critères** : tests numériques déterministes.

## 7.3 `lib/finance/backtest.ts`

* [ ] Simulation **bar-by-bar**, coûts & slippage, equity curve.
* [ ] Export des **metrics** (ci-dessus).
  **Critères** : tests couvrant equity + metrics passants.

---

# 8) Base de données & queries

## 8.1 `lib/db/schema.ts`

* [ ] Tables : `Analysis`, `Research`, `AttentionMarker`, `Strategy`, `StrategyVersion`, `StrategyBacktest`.
* [ ] Colonnes **`jsonb`** pour params/résultats.
  **Critères** : schéma complet, migrations à jour.

## 8.2 `lib/db/queries.ts`

* [ ] `saveAnalysis`, `listAnalysesByChatId`, `createResearch`, `updateResearch`, `getResearchById`, `listResearchByChatId`, `saveAttentionMarker`.
* [ ] `createStrategy`, `listStrategiesByChat`, `getStrategyById`, `createStrategyVersion`, `saveBacktest`, `updateStrategyStatus`.
* [ ] **Index** suggéré : `(chatId, updatedAt)` sur listes.
  **Critères** : latence faible en liste ; tests API **verts**.

## 8.3 `lib/db/migrate.ts`

* [ ] Migrations idempotentes, versionnées.
  **Critères** : exécutions répétées sans échec.

---

# 9) UI Finance & Dashboard Bento

## 9.1 `app/page.tsx`

* [ ] **SSR** pour **Prices + News** (TTL raisonnable, cache Next).
* [ ] Intégrer **LanguageSwitcher**.
  **Critères** : FCP utile, FR/EN.

## 9.2 `components/dashboard/{BentoGrid,BentoCard}.tsx`

* [ ] Props `title`, `actions`, `aria-labelledby`.
* [ ] Responsive 2–4 colonnes.
  **Critères** : lisible, A11y de base.

## 9.3 Tuiles

**`components/dashboard/tiles/CurrentPricesTile.tsx`**

* [ ] Polling 10–15s via routes finance (SSR + hydrate).
* [ ] WS Binance si symbol crypto ; fallback polling REST.
* [ ] `Intl.NumberFormat` selon locale.
  **Critères** : mise à jour fluide, FR/EN.

**`components/dashboard/tiles/NewsTile.tsx`**

* [ ] Flux RSS agrégés (publics).
* [ ] **Sanitize** descriptions (cheerio/DOMPurify client si besoin).
* [ ] Dates relatives `Intl.RelativeTimeFormat`.
  **Critères** : zéro XSS, FR/EN.

**`components/dashboard/tiles/StrategiesTile.tsx`**

* [ ] Liste par **chatId**, statut `draft/proposed/validated`.
* [ ] CTA → **StrategyWizard** ; liens vers détail.
  **Critères** : navigation claire.

**`components/dashboard/tiles/AnalysesTile.tsx`**

* [ ] Liste `Analysis` & `Research` par **chatId**.
* [ ] Filtres (type, symbole).
  **Critères** : filtres fonctionnels.

**`components/dashboard/tiles/MenuTile.tsx`**

* [ ] Consommer `financeToolbarItems` **inline**.
  **`components/toolbar.tsx`**
* [ ] AUCUN overlay (`position: fixed`, backdrop, z-index élevés) — retirer si présent.
  **Critères** : menu bento non superposé.

## 9.4 Chart & interactions

**`components/finance/ChartPanel.tsx`**

* [ ] `import { createChart } from 'lightweight-charts'`.
* [ ] API `ref` : `setData`, `addOverlay`, `addStudy`, `addAnnotation`, `focusArea`.
* [ ] Resize, crosshair events, timeScale nav.
  **Critères** : `ui.show_chart` + `ui.add_annotation` visibles.

**`components/finance/ChartToolbar.tsx` / `AttentionLayer.tsx`**

* [ ] Boutons pour déclencher tools UI (annotations, focus).
  **Critères** : agent + utilisateur peuvent attirer l’attention sur une zone.

**`components/finance/StrategyWizard.tsx`**

* [ ] Questions FR/EN : horizon, risque, univers, coûts/slippage, MDD toléré, contraintes (ESG, fréquence).
* [ ] Enchaîne `strategy.start_wizard` → `strategy.propose`.
  **Critères** : collecte propre, i18n.

**`components/finance/StrategyCard.tsx` / `BacktestReport.tsx`**

* [ ] Actions : **Backtest**, **Refine**, **Finalize**.
* [ ] Rapport (equity, metrics) — lightweight-charts.
  **Critères** : lecture claire, FR/EN.

---

# 10) Sécurité & hygiène

## 10.1 News sanitize

* [ ] Côté serveur (cheerio) et/ou client (DOMPurify) sur HTML RSS.
  **Critères** : pas d’injection script dans `NewsTile`.

## 10.2 SEC User-Agent

* [ ] UA **générique** par défaut (sans clé), override **optionnel** par env.
  **Critères** : tests `sec-user-agent` passent (déjà verts).

## 10.3 Scan secrets (build/CI)

* [ ] Script qui échoue s’il trouve `api[_-]?key|x-api-key|bearer`.
  **Critères** : pipeline protège contre les fuites.

---

# 11) Accessibilité & ergonomie

* [ ] `aria-label` / `aria-labelledby` sur tuiles, boutons.
* [ ] Focus visible ; tab/shift+tab parcourent tout.
* [ ] Skeletons/Empty states **bilingues**.
  **Critères** : navigation clavier fluide, aucune “trappe” focus.

---

# 12) Tests — unitaires, API, AI/tools, E2E

## 12.1 Finance (unit)

* [ ] `tests/finance/yahoo.test.ts` — OHLC/quotes (mocks, fallback).
* [ ] `tests/finance/stooq.test.ts` — daily fallback.
* [ ] `tests/finance/binance.test.ts` — WS parse + REST klines fallback.
* [ ] `tests/finance/sec.test.ts` — parsing filings basique.
* [ ] `tests/finance/indicators.test.ts` — valeurs connues.
* [ ] `tests/finance/risk.test.ts` — ratios.
* [ ] `tests/finance/strategies.test.ts` — règles de base.
* [ ] `tests/finance/backtest.test.ts` — **CAGR/Sharpe/Sortino/MDD/PF/Hit-rate**.

## 12.2 API

* [ ] `tests/api/finance/quote.test.ts`, `ohlc.test.ts`, `strategy.test.ts`, `sec-user-agent.test.ts`.
  **Critères** : `sec-user-agent` OK (déjà vert).

## 12.3 AI/tools

* [ ] `tests/ai/tools-finance.strategy.test.ts` — wizard→propose→backtest→refine→finalize (mock `persistAnalysis`/UI).
* [ ] `tests/ai/prompts-i18n.test.ts` — FR/EN disclaimers/structure.

## 12.4 Dashboard & E2E (Playwright)

* [ ] `tests/dashboard/*` — 4 tuiles : loading/data/error, filtres, formats `Intl`.
* [ ] `tests/e2e/dashboard.spec.ts` — 4 tuiles + **Menu tuile**, FR/EN.
* [ ] `tests/e2e/strategy-wizard.spec.ts` — scénario complet, annotations visibles.
  **Critères** : **tout vert** ; le WebServer boot grâce à `next-intl.config.ts`.

---

# 13) CI & scripts

* [ ] Script `pnpm test` : unit → API → set `PLAYWRIGHT=True` → E2E.
* [ ] Mocks réseau stables (timeouts/retries) pour éviter flaky.
* [ ] Lint/format (ESLint/Prettier) en pré-commit/CI.
  **Critères** : pipeline stable, temps d’exécution raisonnable.

---

# 14) Documentation

## 14.1 `AGENTS.md`

* [ ] Spécs **`strategy.*`**, **`ui.*`**, **`research.*`** : args/retours, exemples FR/EN, cas d’erreur `zod`.
* [ ] Limites scraping public (rate-limit/TTL), disclaimers.

## 14.2 `README.md`

* [ ] Disclaimer FR/EN (public data / not financial advice).
* [ ] i18n : changer de langue (cookie, pas de préfixe).
* [ ] Captures dashboard/tuiles, scripts de test, variables env non-sensibles.
  **Critères** : onboarding limpide pour dev & QA.

---

## Micro-lot prioritaire (pour cimenter la base)

* [x] **`next-intl.config.ts`** complet + **`middleware.ts`** branché.
* [x] **`i18n/config.ts`** exports statiques (`locales`, `defaultLocale`).
* [x] **`lib/ai/tools-finance.ts`** : exposer **`finance: { ... }`** textuellement (éviter la construction dynamique qui trompe les scanners/tests).
* [ ] **Re-lancer la suite Playwright** : le boot WebServer ne doit plus échouer.

Ensuite, dérouler les sections scrapers/UX/tests/A11y jusqu’au **vert intégral** et à un agent FT/TA qui **agit sur le chart** et **itère des stratégies** avec backtests propres.

---

## Historique

* 2025-05-14: initialisation de la checklist.
* 2025-05-14: alignement i18n (`as-needed`), mise à jour tests & cache Stooq; échec Playwright (libs système manquantes).
* 2025-05-14: bascule `localePrefix` à `never`, mise à jour tests dashboard/wizard, installation deps Playwright.
