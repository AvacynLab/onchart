### LISTE DÉTAILLÉE DE TÂCHES (À COCHER)

*(notation : `[ ]` à faire / `[x]` fait)*

---

## 0. Configuration & environnement

* [x] **`.env.example`**

  * [x] ➕ Ajouter `ALPHA_VANTAGE_KEY, TWELVE_DATA_KEY, YAHOO_WS_URL, TWITTER_BEARER_TOKEN, REDDIT_CLIENT_ID, REDDIT_SECRET`.
  * [x] ⚠️ Documenter la limite gratuite de chaque provider (commentaires en-ligne).

* [x] **`package.json`**

  * [x] ➕ Dépendances prod : `yahoo-finance-ws`, `ta-lib`, `pandas-ta`, `rss-parser`, `drizzle-kit`, `lightweight-charts`.
  * [x] ➕ Dépendances dev : `ts-node`, `tsx`, `@types/rss-parser`.
  * [x] 🔧 Script `dev` → démarrer en // le *worker* de marché (`pnpm run market:dev`).
  * [x] ➕ Scripts :

    * `"market:dev": "tsx scripts/market-worker.ts"`
    * `"market:build": "tsup scripts/market-worker.ts --format esm --dts"`

---

## 1. Base de données (Drizzle / Postgres)

* [x] **`lib/db/schema.ts`**

  * [x] ➕ Tables :

    * `market_tick` (symbol, ts, price, volume)
    * `candle` (symbol, interval, open, high, low, close, volume, ts_start, ts_end, primary key (symbol, interval, ts_start))
    * `fundamentals` (symbol, json, updated_at)
    * `news_sentiment` (id uuid pk, symbol, headline, url, score, ts)
    * `watchlist` (symbol)
  * [x] ➕ Index `idx_candle_symbol_interval_ts`.

* [x] **`lib/db/migrations/**`**

  * [x] Générer migration `drizzle-kit generate`.
  * [x] Vérifier que `lib/db/migrate.ts` exécute bien les nouvelles migrations.

---

## 2. Collecte & stockage temps réel

### 2.1 Worker marché (Node standalone)

* [x] **`scripts/market-worker.ts`** *(nouveau)*

  * [x] Connexion WebSocket `YAHOO_WS_URL`.
  * [x] Souscription dynamique à la liste de symboles (lire table `watchlist` si existante, sinon env var).
  * [x] Pour chaque tick → insert `market_tick` + mise à jour **buffer en mémoire** pour agrégation.
  * [x] Toutes les 5 s : flush buffer vers table `candle` (5 m en construction); idem 15 m, 1 h, 4 h, 1 d.
  * [x] Fallback REST (Alpha Vantage) quand WebSocket
    ne renvoie plus depuis > 30 s (sémaphore).

### 2.2 Scheduler fondamentaux

* [x] **`scripts/fundamentals-refresh.ts`** *(nouveau)*

  * [x] Récupère états financiers via Financial Modeling Prep & IEX Cloud.
  * [x] Upsert ligne `fundamentals`.
  * [x] Cron daily à 07:00 UTC (doc dans `README.md`).

### 2.3 Scraping sentiment / news

* [x] **`scripts/news-worker.ts`** *(nouveau)*

  * [x] Parse flux RSS (Bloomberg, CNBC, Reuters) → table `news_sentiment`.
  * [x] Score polarité (VADER).

* [x] **`scripts/reddit-twitter-worker.ts`** *(nouveau)*

  * [x] Stream tweets / posts contenant `$SYMBOL`.
* [x] Score polarité (VADER) → insert `news_sentiment` (type `social`).

---

## 3. API Next 13 (App Router)

### 3.1 Routes marché

* [x] **`app/api/market/[symbol]/candles/[interval]/route.ts`** *(nouveau)*

  * [x] `GET` : renvoie 500 bougies (`lib/db/queries.ts`).

* [x] **`app/api/market/[symbol]/live/route.ts`** *(nouveau – WebSocket)*

  * [x] Upgrade WS, push ticks & dernière bougie en formation.

### 3.2 Routes fundamentals & sentiment

* [x] **`app/api/fundamentals/[symbol]/route.ts`** *(nouveau)*

  * [x] `GET` : renvoie JSON de la dernière ligne `fundamentals`.

* [x] **`app/api/sentiment/[symbol]/route.ts`** *(nouveau)*

  * [x] `GET` : agrège score 24 h & retourne histogramme.

### 3.3 Routes IA tools

* [x] **`app/api/ai/analyse-asset/route.ts`** *(nouveau)*

  * [x] `GET` : expose l'outil d'analyse d'actif.

* [x] **`app/api/ai/scan-opportunities/route.ts`** *(nouveau)*

  * [x] `GET` : renvoie les opportunités détectées.

* [x] **`app/api/ai/highlight-price/route.ts`** *(nouveau)*

  * [x] `POST` : diffuse une annotation de prix.

---

## 4. Outils IA pour l’agent

* [x] **`lib/ai/tools/get-chart.ts`** *(nouveau)*

  * [x] Paramètres : `symbol`, `interval` → renvoie URL `/api/market/${symbol}/candles/${interval}` + spec chart.

* [x] **`lib/ai/tools/highlight-price.ts`** *(nouveau)*

  * [x] Ajoute annotation via Channel `ai-events` (WebSocket).

* [x] **`lib/ai/tools/scan-opportunities.ts`** *(nouveau)*

  * [x] Query : top `news_sentiment` + breakout EMA.

* [x] **`lib/ai/tools/analyse-asset.ts`** *(nouveau)*

  * [x] Compose fundamentals + sentiment + technique résumés.

* [x] **`lib/ai/prompts.ts`**

  * [x] ➕ Section “Financial Analyst System Prompt”.

---

## 5. Intégration « documents » / artifacts

### 5.1 Nouveau *artifact* “chart”

* [x] **`artifacts/chart/server.ts`** *(nouveau)*

  * [x] `createDocumentHandler<'chart'>` : stocke config (symbol, interval, studies).

* [x] **`artifacts/chart/client.tsx`** *(nouveau)*

  * [x] Rendu `LightweightChart` + overlays IA.

* [x] **`artifacts/actions.ts`**

  * [x] ➕ export `getChartDocument()`.

### 5.2 Extension du tool “create-document”

* [x] **`lib/ai/tools/create-document.ts`**

  * [x] Ajouter support `kind: 'chart'`.

---

## 6. Front-end : dashboard TradingView-like

### 6.1 Composants

* [x] **`components/ChartWidget.tsx`** *(nouveau)*

  * [x] Instancie `LightweightChart` (lazy-load lib).
  * [x] DataFeed via WebSocket hook (`useMarketSocket`).

* [x] **`components/AssetSidebar.tsx`** *(nouveau)*

  * [x] Tabs **Overview / Fundamentals / Sentiment / News**.

* [x] **`components/AIAnnotations.tsx`** *(nouveau)*

  * [x] Abonne au WS `ai-events`, appelle `chart.addShape()`.

### 6.2 Hooks

* [x] **`hooks/useMarketSocket.ts`** *(nouveau)*

  * [x] Gère reconnexion + throttling 5 Hz.

* [x] **`hooks/useAgent.ts`** *(update)*

  * [x] Ajouter appels aux nouveaux tools.

### 6.3 Pages

* [x] **`app/(chat)/chart/[symbol]/[interval]/page.tsx`** *(nouveau)*

  * [x] Affiche `ChartWidget` + `AssetSidebar` + zone chat contextuelle.

---

## 7. Événements IA / callouts

* [x] **`lib/ai/event-engine.ts`** *(nouveau)*

  * [x] Sur réception d’un croisement EMA ou pic de sentiment → `broadcastAIEvent(symbol, message, level, ts)`.

* [x] **`components/Toast.tsx`** *(update)*

  * [x] Afficher notification niveau `AIEvent`.

---

## 8. Tests

* [x] **`lib/ai/tools/__tests__/get-chart.test.ts`**

  * [x] Vérifie format tool.

* [x] **`app/api/market/[symbol]/candles/[interval]/route.test.ts`**

  * [x] Mock la requête et vérifie la réponse JSON.

* [x] **`app/api/sentiment/[symbol]/route.test.ts`**

  * [x] Mock la requête et vérifie la réponse JSON agrégée.

* [x] **`app/api/market/[symbol]/live/route.test.ts`**

  * [x] Simule bus d'événements et vérifie la diffusion des ticks et bougies.

* [x] **`scripts/__tests__/market-worker.test.ts`**

  * [x] Mock WS, assure tick→candle ok.

* [x] **`app/api/ai/analyse-asset/route.test.ts`**

  * [x] Vérifie la réponse de l'endpoint.

* [x] **`app/api/ai/scan-opportunities/route.test.ts`**

  * [x] Vérifie la réponse de l'endpoint.

* [x] **`app/api/ai/highlight-price/route.test.ts`**

  * [x] Vérifie la diffusion de l'événement.

* [x] **`hooks/__tests__/useAgent.test.ts`**

  * [x] Vérifie les appels aux endpoints et la construction du chart.

* [x] **`components/__tests__/ChartWidget.test.tsx`**

  * [x] Rend & met à jour en live (test du helper `applyCandleUpdate`).

* [x] **`components/__tests__/AIAnnotations.test.tsx`**

  * [x] Vérifie que les événements highlight ajoutent une forme au graphique.

---

## 9. CI

* [x] **`.github/workflows/ci.yml`**

  * [x] **jobs**: lint → test → build (inclut `market:build`).

---

## 10. Documentation

* [x] **`README.md`**

  * [x] Section *Financial Module* : setup env, lancer workers, endpoints.
* [x] **`docs/AI_TOOLS.md`** : description des nouveaux tools.
* [x] **`docs/DATA_FLOW.md`** : schéma collecte → stockage → front (PlantUML).

---

### OBJECTIFS ATTENDUS / CORRECTIFS À APPORTER

| Bloc            | Objectif observable                                                                 | Correctifs/Notes                               |
| --------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------- |
| Collecte marché | Ticks reçus & bougies 5m persistantes, ≤ 200 ms de retard                           | Vérifier buffer flush, gérer retry WS          |
| Fondamentaux    | `/api/fundamentals/AAPL` retourne JSON valide                                       | Mapping FMP→DB                                 |
| Sentiment       | `/api/sentiment/AAPL` renvoie score & histogram                                     | NLP simple VADER, normalisation                |
| Agent IA        | “Montre le graph 15m de TSLA et souligne le dernier plus haut” → chart + annotation | Ajout des tools `get-chart`, `highlight-price` |
| Front           | Navigation fluide entre symboles, pas de freeze (< 60 fps)                          | WebSocket throttling et suspense React         |
| Tests           | couverture > 80 % sur nouvelles libs                                                | utiliser Vitest + msw                          |
| CI              | pipeline verte, image worker publiée                                                | ajouter step build worker                      |

---

### Historique
- Initialisation du fichier et import de la liste de tâches.
- Ajout des clés d'environnement et mise à jour de `package.json`.
- Ajout des tables financières et génération de la migration (échec connexion BDD lors de l'exécution).
- Création du tool `get-chart`, intégration au chat et ajout du prompt "Financial Analyst" avec son test.
- Ajout de la requête `getCandles`, de la route API correspondante et d'un test de l'endpoint.
- Ajout de la requête `getFundamentals`, de la route API correspondante et d'un test de l'endpoint.
- Ajout de la requête `getSentiment24h`, de la route API `/api/sentiment/[symbol]` et du test associé.
- Ajout du moteur d'événements AI et du tool `highlight-price`, intégrés à la route de chat avec test.
- Ajout des tools `scan-opportunities` et `analyse-asset`, intégrés au chat et couverts par des tests.
- Vérification du script de migration et ajout de notifications toast pour les événements IA.
- Création du hook `useMarketSocket` avec reconnexion et throttling, composant `ChartWidget` utilisant `LightweightChart`.
- Ajout du composant `AssetSidebar` avec onglets et test de rendu.
- Ajout du composant `AIAnnotations` abonné aux événements IA avec test unitaire et intégration dans `ChartWidget`.
- Création de la page `app/(chat)/chart/[symbol]/[interval]` affichant `ChartWidget`, `AssetSidebar` et un chat contextuel.
- Ajout d'un test de rendu serveur pour `ChartWidget` (mise à jour en direct à compléter).
- Implémentation de l'endpoint WebSocket `/api/market/[symbol]/live` et bus d'événements marché avec test de diffusion tick/bougie.
- Mise en place d'un workflow CI exécutant lint, tests et build (incluant `market:build`).
- Ajout de la documentation du module financier : section README, description des outils IA et schéma de flux de données.
- Ajout de la fonction `aggregateTicks` dans le worker marché et d'un test unitaire vérifiant la conversion tick→bougie.
- Ajout de l'artifact `chart` (serveur & client), export de `getChartDocument`, support `kind: 'chart'` dans `create-document` et test du handler.
- Implémentation complète du worker de marché : connexion WebSocket, insertion des ticks, agrégation multi-intervalle et fallback Alpha Vantage.
- Ajout du script `fundamentals-refresh` collectant les fondamentaux via FMP et IEX et testant l'upsert.
- Implémentation du `news-worker` agrégeant les flux RSS, calculant le score VADER et ajoutant un test unitaire.
- Implémentation du `reddit-twitter-worker` capturant les posts sociaux, calculant le score VADER et testant l'insertion en base.
- Ajout du helper `applyCandleUpdate` et d'un test assurant la mise à jour live du `ChartWidget`.
- Ajout du hook `useAgent` exposant les tools IA via des endpoints dédiés et création des tests associés.
- Ajout des variables `FMP_API_KEY` et `IEX_CLOUD_KEY` dans `.env.example`.
- Retrait de la variable d'environnement `MARKET_SYMBOLS` (liste des symboles désormais gérée côté SaaS).
- Remplacement de la dépendance inexistante `tradingview-lightweight-charts` par `lightweight-charts` et correction des avertissements ESLint.
- Ajout de la dépendance de build `tsup` et d'un stub de types pour `rss-parser` (package de types introuvable).
- Chargement dynamique de la watchlist depuis la base (fallback env `MARKET_SYMBOLS`) utilisé par tous les workers.
- Correction de la tâche `reddit-twitter-worker` pour indiquer l'usage de VADER pour le scoring de polarité.
- Ajout de la table `watchlist` au schéma et migration associée, utilisation typée dans `getWatchlistSymbols`.

- Vérification finale : toutes les tâches cochées, aucun changement fonctionnel requis. Tests Playwright à exécuter après installation des navigateurs.
- Exécution des tests unitaires (`pnpm test`) : échec dû à l'absence des navigateurs Playwright.
