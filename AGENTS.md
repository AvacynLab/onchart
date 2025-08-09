# AGENTS

## Tasks

Voici une **checklist opérationnelle, exhaustive et hiérarchisée** (avec sous-étapes imbriquées), **fichier par fichier**, pour étendre la version actuelle du code en y ajoutant :

* Un **dashboard d’accueil** en **bento layout** (cours en direct, news, “Mes stratégies”, “Mes analyses”, menu en tuile non-superposé).
* Un **système Stratégies** (questionnaire → boucle agent → génération → backtest → itérations → arguments).
* Les **petites améliorations** relevées au dernier audit (prompt FR, tests supplémentaires, robustesse scraping).
* **Uniquement des APIs publiques sans clé** et/ou **scrapers maison** (déjà compatibles avec votre code actuel).

> Chaque bloc liste : **Tâches** (✅/☐), **Fichiers** précis, **Objectifs attendus**, **Correctifs**.

---

# 1) Dashboard d’accueil “Bento”

## 1.1 Structure de page & grille Bento

* [x] Créer la **page d’accueil** (route `/`) qui héberge le bento

  * **Fichiers**

    * [x] `app/page.tsx` (nouveau) — **SSR** + suspense edges
    * [x] `components/dashboard/BentoGrid.tsx` (nouveau) — grille responsive (CSS Grid), slots nommés
    * [x] `components/dashboard/BentoCard.tsx` (nouveau) — tuile stylée (titre, actions, body)
  * **Objectifs**

    * Layout fluide (2–4 colonnes selon largeur), tuile **Menu** intégrée (pas de superposition).
  * **Correctifs**

    * Éviter tout overlay global (désactiver backdrop, z-index élevés) dans l’ancien menu.

## 1.2 Tuile “Cours actuels” (fenêtre principale)

* [x] Afficher **watchlist** + **cours** (EQ/FX/CRYPTO) en quasi temps réel

  * **Fichiers**

    * [x] `components/dashboard/tiles/CurrentPricesTile.tsx` (nouveau)
    * [x] `lib/finance/live.ts` (nouveau) — multiplex :

      * equities/indices : **polling Yahoo** (5–10s TTL via `lib/finance/cache.ts`)
      * crypto : **WebSocket Binance** (si dispo côté client) sinon polling
    * [x] Utilise déjà `app/(chat)/api/finance/quote/route.ts` (existant) pour SSR/Hydrate
  * **Objectifs**

    * Lister symboles récents + favoris (fallback statique si pas d’historique).
    * Variations %, marketState, badges “Open/Closed”.
  * **Correctifs**

    * Timeouts fetch explicites (8–10s) + retry (2×) côté `live.ts`.

## 1.3 Tuile “Dernières news”

* [x] Streamer **news publiques** (RSS) par univers/symboles

  * **Fichiers**

    * [x] `components/dashboard/tiles/NewsTile.tsx` (nouveau)
    * [x] Réutiliser `app/(chat)/api/finance/news/route.ts` (existant)

      * requête paramétrée `?symbol=...` + fallback “top business”
  * **Objectifs**

    * Liste chronologique, source + date relative, “ouvrir dans nouvel onglet”.
  * **Correctifs**

    * Limiter XSS (sanitizer sur `description` RSS).

## 1.4 Tuile “Mes stratégies”

* [x] Lister **stratégies** (nouvelle table) et actions rapides (ouvrir, backtester, affiner)

  * **Fichiers**

    * [x] `components/dashboard/tiles/StrategiesTile.tsx` (nouveau)
    * [x] `components/finance/StrategyCard.tsx` (nouveau)
    * [x] API : `app/(chat)/api/finance/strategy/route.ts` (nouveau, CRUD list/byId)
  * **Objectifs**

    * Groupé par **chat** courant (conserver historique), dernière mise à jour, statut (ébauche/validée).
  * **Correctifs**

    * Pagination infinie (lazy) + suspense.

## 1.5 Tuile “Mes analyses”

* [x] Lister **analyses/recherches** déjà persistées (existe via `analysis`/`research`)

  * **Fichiers**

    * [x] `components/dashboard/tiles/AnalysesTile.tsx` (nouveau)
    * [x] Réutiliser `lib/db/queries.ts` (`listAnalysesByChatId`, `listResearchByChatId`)
  * **Objectifs**

    * Trier par date desc, badges type (OHLC, FT report, deep dive, opportunity), lien vers chat.
  * **Correctifs**

    * Ajout de filtres (type, symbole).

## 1.6 Tuile “Menu (intégré, non superposé)”

* [x] Remplacer le menu déroulant superposé par une **tuile Bento**

  * **Fichiers**

    * [x] `components/dashboard/tiles/MenuTile.tsx` (nouveau)
    * [x] Modifier `components/toolbar.tsx` :

      * [x] extraire la logique d’ouverture/fermeture vers un **store local** (React state/context)
      * [x] **désactiver** l’overlay/backdrop ; rendre la liste du menu **inline** dans la tuile
  * **Objectifs**

    * Même mécanique d’ouverture, mais dans la grille → la tuile **disparaît/apparaît** (pas overlay).
  * **Correctifs**

    * Supprimer styles `position: fixed/absolute` + `z-index` du menu global.

---

# 2) Système “Stratégies” (questionnaire → boucle agent → backtest)

## 2.1 Schéma & persistance

* [x] Étendre DB pour les stratégies

  * **Fichiers**

    * [x] `lib/db/schema.ts`

      * [x] `Strategy`: `id`, `userId`, `chatId`, `title`, `universe (jsonb)`, `constraints (jsonb)`, `status ('draft'|'proposed'|'validated')`, `createdAt`, `updatedAt`
      * [x] `StrategyVersion`: `id`, `strategyId`, `description`, `rules (jsonb)`, `params (jsonb)`, `notes (text)`, `createdAt`
      * [x] `StrategyBacktest`: `id`, `strategyVersionId`, `symbolSet (jsonb)`, `window`, `metrics (jsonb)`, `equityCurve (jsonb)`, `assumptions (jsonb)`, `createdAt`
    * [x] `lib/db/migrate.ts` — migration
    * [x] `lib/db/queries.ts` — `createStrategy`, `listStrategiesByChat`, `getStrategyById`, `createStrategyVersion`, `saveBacktest`
  * **Objectifs**

    * Historiser **versions** et **résultats de backtest**.
  * **Correctifs**

    * Index sur `(chatId, updatedAt)`.

## 2.2 Orchestrateur & tools

* [x] **Boucle agent** pilotée par tools (sans appels externes privés)

  * **Fichiers**

    * [x] `lib/ai/tools-finance.ts` — **ajouter namespace `strategy.*`** :

      * [x] `strategy.start_wizard({})` → poser questions ciblées (horizon, risque, univers, fréquence, coûts, restrictions ESG, drawdown toléré)
      * [x] `strategy.propose({ answers })` → propose règles initiales (utilise `lib/finance/strategies.ts`)
      * [x] `strategy.backtest({ versionId, symbols, timeframe, range, costs, slippage })` → via `lib/finance/backtest.ts` (nouveau)
      * [x] `strategy.refine({ versionId, feedback })` → modifie params/règles et **relance backtest**
      * [x] `strategy.finalize({ versionId })` → statut “validated”
      * [x] `strategy.list({ chatId })`, `strategy.get({ id })`
    * [x] `lib/finance/backtest.ts` (nouveau)

      * Moteur simple **bar-by-bar** (OHLC), exécution signaux “enter/exit”, coûts & slippage, equity curve, métriques (CAGR, Sharpe, Sortino, MDD, hit-rate, profit factor).
  * **Objectifs**

    * Itérations **garanties** : au moins 2 cycles *propose → backtest → refine*.
  * **Correctifs**

    * Validation d’entrées avec `zod`, garde-fous (fenêtres min OHLC, symboles valides).

## 2.3 UI : Wizard & cartes

* [x] **Questionnaire** avant génération

  * **Fichiers**

    * [x] `components/finance/StrategyWizard.tsx` (nouveau) — multistep (horizon, risque, univers, frais)
    * [x] `components/dashboard/tiles/StrategiesTile.tsx` — bouton “Créer une stratégie”
  * **Objectifs**

    * Collecter contraintes → déclencher `strategy.start_wizard` / `strategy.propose`.
* [x] **Affichage & gestion**

  * **Fichiers**

    * [x] `components/finance/StrategyCard.tsx` — statut, dernière perfo, actions (backtester, affiner)
    * [x] `components/finance/BacktestReport.tsx` (nouveau) — equity curve (mini chart), tableau des métriques
  * **Correctifs**

    * Réutiliser `lightweight-charts` pour equity curve ; limiter points (resample).

## 2.4 API & intégration chat

* [x] Exposer **endpoints** Stratégie

  * **Fichiers**

    * [x] `app/(chat)/api/finance/strategy/route.ts` — `GET list`, `POST create`, `GET byId`, `POST backtest`, `PATCH refine`, `POST finalize`
* [x] Brancher **tools** au chat (déjà en place via `financeToolMap`)

  * **Fichiers**

    * [x] `app/(chat)/api/chat/route.ts` — rien à changer côté injection (namespacing existant), seulement activer les clés `strategy.*` dans `activeTools` si filtrage.

---

# 3) “Mes analyses” & “Mes stratégies” — affichage par chat + historique conservé

* [x] Sous les titres, afficher **liste historisée** **par chat**

  * **Fichiers**

    * [x] `components/dashboard/tiles/AnalysesTile.tsx` — groupe par `chatId`, montre **dernier message** du chat associé
    * [x] `components/dashboard/tiles/StrategiesTile.tsx` — idem (stratégies attachées à chat)
  * **Objectifs**

    * Lien “Ouvrir le chat” (`/chat/[id]`), conserver contexte d’origine.
  * **Correctifs**

    * [x] `lib/db/queries.ts` — ajouter batch queries “by chat ids” pour limiter N+1.

---

# 4) Menu déroulant → **tuile** (non superposée)

* [x] Refonte visuelle & comportement

  * **Fichiers**

    * [x] `components/toolbar.tsx` — extraire `financeToolbarItems` (déjà en place) vers tuile
    * [x] `components/dashboard/tiles/MenuTile.tsx` — affiche/masque inline
  * **Objectifs**

    * **Plus d’overlay** : la tuile **disparaît** de la grille quand fermée.
  * **Correctifs**

    * Supprimer styles overlay/backdrop/global capture ; gérer focus à l’intérieur de la tuile.

---

# 5) Prompts & conformité FR

* [x] Ajouter **disclaimer FR** et consignes UI/finance

  * **Fichiers**

    * [x] `lib/ai/prompts.ts` — section FR :

      * *“Les données sont publiques, non garanties, et peuvent être incomplètes. Les réponses ne constituent pas un conseil en investissement.”*
      * Rappels : “préciser timeframe avant `ui.show_chart`”, “utiliser `compute_indicators` pour TA”, “structurer documents (Résumé, Contexte, Données, Graphiques, Signaux, Risques, Sources)”.
  * **Objectifs**

    * Alignement FR/EN + robustesse du raisonnement agent.
  * **Correctifs**

    * Vérifier qu’`experimental_activeTools` liste bien `strategy.*` si filtrage par modèle.

---

# 6) Tests

## 6.1 Unitaires

* [x] **Backtest engine**

  * **Fichiers** : `tests/finance/backtest.test.ts` (nouveau)
  * **Objectifs** : signaux simples, coûts, MDD, Sharpe/Sortino, régresseurs.
* [x] **Strategy tools**

  * **Fichiers** : `tests/ai/tools-finance.strategy.test.ts` (nouveau)
  * **Objectifs** : `start_wizard`→`propose`→`backtest`→`refine`→`finalize`, mocks de persistance/événements.
* [x] **Dashboard tiles**

  * **Fichiers** :
    * [x] `tests/dashboard/prices-tile.node.test.tsx`
    * [x] `tests/dashboard/news-tile.node.test.tsx`
    * [x] `tests/dashboard/strategies-tile.test.tsx`
    * [x] `tests/dashboard/analyses-tile.test.tsx`
  * **Objectifs** : rendu, états vides, erreurs, pagination.

## 6.2 API

* [x] **Stratégie CRUD & backtest**

  * **Fichiers** : [x] `tests/api/finance/strategy.test.ts` (nouveau)
  * **Objectifs** : endpoints, validation `zod`, erreurs.

## 6.3 E2E (Playwright)

* [x] **Parcours Stratégie**

  * **Fichier** : `tests/e2e/strategy-wizard.spec.ts` (nouveau)
  * **Scénario** : ouvre dashboard → lance wizard → propose stratégie → backtest → raffinement → validation → cartographie des tuiles mises à jour.
* [x] **Dashboard**

  * **Fichier** : `tests/e2e/dashboard.spec.ts` (nouveau)
  * **Scénario** : flux d’accueil, news, interaction tuile menu (pas d’overlay), clic vers chat d’origine.

---

# 7) Robustesse scraping & perfs

* [x] **Timeouts & retries** (si absent)

  * **Fichiers** : `lib/finance/sources/{yahoo.ts, stooq.ts, binance.ts, sec.ts, news.ts}`, `lib/finance/live.ts`
  * **Objectifs** : timeout 8–10s, 2 retries exponentiels, fallback Stooq/Yahoo selon classe d’actif.
  * [x] Ajouter un backoff exponentiel dans `lib/finance/request.ts` avec tests dédiés
* [x] **Cache TTL** affiné

  * **Fichiers** : `lib/finance/cache.ts`
  * **Objectifs** : intraday 10–15s ; daily 5–10 min ; invalidation si WebSocket ouvert.

---

# 8) UI/UX polissage

* [x] **Skeletons/Loaders** pour tuiles

  * **Fichiers** : `components/dashboard/skeletons/*.tsx` (nouveaux)

* [x] **Empty states** guidés (FR)

  * **Fichiers** : `components/dashboard/empty/*.tsx` (nouveaux)
* [x] **Accessibilité** (focus management, aria)

  * **Fichiers** : tuiles & toolbar
* [x] **I18N cohérente** (FR)

  * **Fichiers** : tuiles + prompts

---

# 9) Documentation & exemples

* [x] **AGENTS.md** (mettre à jour)

  * **Fichiers** : `AGENTS.md`
  * **Objectifs** : spécs `strategy.*`, `ui.*`, formats E/S, exemples d’appels.
* [x] **README.md**

  * **Fichiers** : `README.md`
  * **Objectifs** : capture d’écran dashboard, disclaimer FR, démarrage, limites “public only”.

---

## Récapitulatif par fichiers (créations/modifs)

### Nouveaux

* `app/page.tsx`
* `components/dashboard/BentoGrid.tsx`
* `components/dashboard/BentoCard.tsx`
* `components/dashboard/tiles/{CurrentPricesTile.tsx, NewsTile.tsx, StrategiesTile.tsx, AnalysesTile.tsx, MenuTile.tsx}`
* `components/finance/{StrategyWizard.tsx, StrategyCard.tsx, BacktestReport.tsx}`
* `lib/finance/{backtest.ts, live.ts}`
* `app/(chat)/api/finance/strategy/route.ts`
* **Tests** :
  `tests/finance/backtest.test.ts`,
  `tests/ai/tools-finance.strategy.test.ts`,
  `tests/dashboard/*.test.tsx`,
  `tests/api/finance/strategy.test.ts`,
  `tests/e2e/{strategy-wizard.spec.ts, dashboard.spec.ts}`

### Modifiés

* `components/toolbar.tsx` (menu → tuile inline, pas overlay)
* `components/finance/FinancePanel.tsx` (si intégration liens dashboard)
* `lib/ai/tools-finance.ts` (ajout namespace `strategy.*`)
* `lib/ai/prompts.ts` (disclaimer & consignes FR)
* `lib/db/schema.ts`, `lib/db/migrate.ts`, `lib/db/queries.ts` (schéma stratégie)
* `lib/finance/sources/*` (timeouts/retries si manquants)
* `lib/finance/cache.ts` (TTL ajustés)

---

## Objectifs attendus (acceptance)

* Le **dashboard** à `/` affiche :

  * **Cours** (watchlist/récents) live/pollés,
  * **News** (RSS) récentes,
  * **Mes stratégies** (CRUD, états, backtests),
  * **Mes analyses** (OHLC, FT reports, deep-dives) **par chat**,
  * **Menu** comme **tuile** (pas d’overlay).
* L’**agent** peut :

  * Poser les **bonnes questions**, **proposer** une stratégie,
  * **Backtester**, **affiner** en boucle,
  * **Finaliser** la stratégie et **sauvegarder** versions/backtests.
* Les **tests** passent (unitaires, API, E2E) ; prompts FR présents.

---


## Info
- Aucune donnée sensible, sources publiques uniquement.
- Objectif: intégrer un agent financier avec dashboard bento et système de stratégies.

## History
- Reset AGENTS.md with new dashboard and strategies roadmap; no tasks started yet.
- Implemented Bento dashboard skeleton with page, grid, card and menu tile; added toolbar store and basic component tests.
- Added live quotes tile and polling helper with timeout/retry; covered with node test.
- Implemented News tile fetching RSS via API with XSS sanitisation and accompanying unit test.
- Added French disclaimer and finance guidelines to prompts with accompanying unit test.
- Added strategy schema, queries and migration; implemented strategy API, card and tile with corresponding tests.
- Switched live quotes helper to reuse internal quote API and added analyses tile with filtering and tests.
- Centralised toolbar visibility in a shared context, removed floating overlay and wired the dashboard menu tile to that store with updated tests.
- Implemented bar-by-bar backtest engine with equity curve and metrics plus unit test.
- Added strategy tool namespace handling wizard, proposal, backtest, refine and finalize operations with corresponding lifecycle test.
- Added strategy creation wizard, backtest report component and tile integration with basic actions and tests.
- Added request helper with timeout/retry, applied across finance sources with Stooq fallback and cache TTL constants.
- Added skeleton placeholders for dashboard tiles and replaced Suspense fallbacks with them; added corresponding unit test.
- Implemented guided empty states for dashboard tiles with French messages and unit tests.
- Added ARIA roles and keyboard focus management to the dashboard menu tile and toolbar; localized market-state badges to French.
- Added chat-scoped listing for analyses and strategies with last message snippets and batch DB queries to avoid N+1; updated tile tests accordingly.
- Added Playwright spec tests for strategy wizard lifecycle and inline dashboard menu; documented dashboard features in README.
- Extended strategy API with backtest, refine and finalize endpoints and expanded API tests accordingly.
- Implemented cursor-based infinite pagination for strategies tile and API with accompanying tests.
- Re-ran full node and Playwright test suites; all tests passed, no remaining tasks.
- Added Binance WebSocket streaming for crypto quotes with unit test and refreshed dashboard prices logic; reran node and Playwright suites.
- Localised strategy status labels in StrategyCard with French translations and ARIA-labelled actions; added unit test and reran dashboard tests.
- Added exponential backoff to fetchWithRetry and covered the helper with dedicated unit tests.
- Documented backtest metric formulas and extended unit test to cover CAGR, Sharpe and Sortino ratios.
- Added error handling for the prices tile initial fetch and cleared request timeouts, adding a unit test for the failure path.
- Executed full node and Playwright test suites to validate dashboard tiles and strategy workflow end-to-end; all checks passed.
- Guarded BacktestReport chart setup behind a matchMedia check to silence test warnings and reran full node and Playwright suites successfully.
- Re-ran node and Playwright test suites to verify all tasks; no missing work found.
