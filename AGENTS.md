## 📋 Checklist détaillée des tâches à réaliser

*(cochez chaque case au fur et à mesure ; les sous-tâches apparaissent en retrait)*

---

### 1. Mise à jour de l’architecture générale

* [x] **Valider l’arborescence actuelle**

  * [x] Confirmer la séparation `frontend/`, `backend/`, `services/`, `docker-compose.yml`.
  * [x] Mettre à jour le diagramme d’architecture (README) avec les nouveaux flux temps réel.
  * [x] Objectif : quiconque ouvre le dépôt comprend le parcours d’un tick jusqu’au navigateur.

* [x] **Ajouter le micro-service `analytics`** (FastAPI + WebSocket)

  * [x] Créer le dossier `services/analytics/` avec `Dockerfile`.
  * [x] Configurer un *entrypoint* asynchrone qui :

    * [x] Se connecte aux flux WebSocket publics (Yahoo, Finnhub) et publie les ticks.
      * [x] Yahoo Finance
      * [x] Finnhub
    * [x] Expose un WebSocket interne `/stream` pour le front.
  * [x] Ajouter `analytics` au `docker-compose.yml` (réseau + volumes).
  * [x] Objectif : isoler la partie temps réel et pouvoir la scaler indépendamment.

---

### 2. Collecte de données (marché)

* [x] **Implémenter le connecteur WebSocket Yahoo Finance**

  * [x] Décoder les messages protobuf/base64.
  * [x] Mapper vers un schéma commun `{symbol, ts, price, volume}`.
  * [x] Gérer la reconnexion automatique.
  * [x] Logique de *throttling* si > N ticks/s.

* [x] **Implémenter le connecteur WebSocket Finnhub**

  * [x] Décoder les messages JSON.
  * [x] Mapper vers un schéma commun `{symbol, ts, price, volume}`.
  * [x] Gérer la reconnexion automatique.
  * [x] Logique de *throttling* si > N ticks/s.

* [x] **Connecteur REST Alpha Vantage / Twelve Data (free tiers)**

  * [x] Endpoint *historique* (`GET /history`) – batching symbol × intervalle.
  * [x] Endpoint *fundamental* (`GET /fundamentals`) – ratios, états financiers.
  * [x] Caching 24 h côté service (Redis).
  * [x] Objectif : respecter les quotas gratuits (< 5 req/min).
  * [x] Ajouter support Twelve Data.

* [x] **Scheduler d’agrégation**

  * [x] Cron async (APScheduler) qui construit les bougies 5 min, 15 min, 1 h, 4 h, 1 D.
  * [x] Stocker les bougies dans la TSDB (TimescaleDB ou SQLite+index si alpha).

---

### 3. Collecte de données (sentiment & news)

* [x] **Scraper flux RSS (Investing, CNBC, Bloomberg)**

  * [x] Parser titre + résumé + horodatage → table `news`.
  * [x] Lancer toutes les 30 s (limite 20 req/min/site).
* [x] **Scraper Reddit et Twitter (API ou HTML fallback)**

  * [x] Recherche sur `r/WallStreetBets`, `r/stocks`, hashtags `$AAPL`…
  * [x] Nettoyer texte → analyse VADER + stockage score sentiment.
  * [x] Twitter (snscrape)
* [x] **Pipeline NLP**

  * [x] Ajouter `nlp_worker.py` (Celery/RQ) qui :

    * [x] Écoute la file `raw_posts`.
    * [x] Calcule `sentiment_score` et `subjectivity`.
    * [x] Publie dans `sentiment` table.
* [x] Objectif : latence < 1 min entre publication et score disponible.

---

### 4. Traitement temps réel & indicateurs

* [ ] **Stream builder**

  * [ ] À chaque tick, mettre à jour :

    * [x] Bougie en formation (cache mémoire).
    * [x] Indicateurs incrémentaux
    * [x] SMA
    * [x] EMA
      * [x] RSI
      * [x] MACD
      * [x] BBands
  * [ ] Utiliser `ta-lib` en mode rolling / update only last row.
* [x] **Écrire la couche repository**

  * [x] Interface `get_candles(symbol, interval, limit)` (TSDB).
  * [x] Interface `get_indicator(symbol, interval, name)` (cache Redis).
* [x] **Tests unitaires**

  * [x] Vérifier qu’un flux de 100 ticks génère la bonne bougie 5 min.
* [x] Comparer indicateur incrémental vs recalcul complet (< 0.1 % erreur).
    * [x] SMA
    * [x] EMA
    * [x] RSI
    * [x] MACD
    * [x] BBands

---

### 5. Stockage & performance

* [x] **Choix TSDB**

  * [x] Essayer `TimescaleDB` (PostgreSQL ext) – rapatriement docker.
  * [x] Migration script `alembic` pour table `ticks`, `candles`, `news`, `sentiment`.
  * [x] Index composites `(symbol, ts DESC)`.
* [x] **Cache mémoire pour hottest symbols**

  * [x] Redis `LRU` 1 Go – dernier million de ticks.
  * [x] TTL adapté à l’intervalle (ex. ticks 1 h, bougies 24 h).

---

### 6. API backend (FastAPI)

* [ ] **Routes REST**

  * [x] `GET /symbols` → métadonnées / watchlist de l’utilisateur.
  * [x] `GET /candles/{symbol}/{interval}` → JSON OHLCV compressé.
  * [x] `GET /indicators/{symbol}/{interval}` → valeurs calculées.
  * [x] `GET /sentiment/{symbol}` → score time-series.
* [ ] **Route WebSocket**

  * [x] `/ws/stream?symbols=AAPL,TSLA&interval=5m` → push JSON delta.
  * [x] Heartbeat + re-auth JWT.

---

### 7. Frontend — integration TradingView-like

* [ ] **Installer TradingView Charting Library (TVCL)**

  * [ ] Ajouter licence gratuite + dossier `public/tvcl`.
  * [ ] Implémenter `tvDatafeed.js` → connecteur vers `/ws/stream`.
  * [ ] Timeframe disponibles : 5, 15, 60, 240, 1D.
* [ ] **Overlay IA / callouts**

  * [ ] Créer composant React `<AiCallout />` positionné sur timestamp + price.
  * [ ] Recevoir événements `"ia-highlight"` via websocket → affiche icône + tooltip.
* [ ] **Chat latéral**

  * [ ] `<ChatAgent />` relié à l’agent (OpenAI functions).
  * [ ] Lorsqu’un utilisateur clique sur une bougie, envoyer contexte (symbol, ts).
* [ ] **Optimisations perf**

  * [ ] Débouncer le rendu à 5 fps.
  * [ ] Utiliser `requestIdleCallback` pour tâches lourdes (indicateurs custom).

---

### 8. Agent & outils d’interaction

* [x] **Définir les “tools” de l’agent**

  * [x] `show_chart(symbol, interval, from, to)` → push event au front.
  * [x] `annotate(ts, price, text, style)` → crée un `AiCallout`.
  * [x] `create_research(type, payload)` → génère un doc (même mécanisme que canva docs).
* [ ] **Implémenter le routeur de fonctions**

  * [x] Fichier `agent_tools.py` déclarant les schemas JSON.
* [x] Langchain/OpenAI Functions qui autorise l’appel automatique.
* [x] **Types de recherches**

  * [x] `opportunity_scan` (multi-marché).
  * [x] `currency_focus` (FX/crypto).
  * [x] `asset_deep_dive` (entreprise).
  * [x] `fundamental_plus_strategy` (analyse F+T, chart, plan).
  * [x] `structured_general` (requête libre structurée).
* [x] **Stockage des recherches**

  * [x] Table `research_docs` (id, user_id, type, json, ts_created).
  * [x] API `/docs/{id}` pour récupérer/éditer.

---

### 9. DevOps & CI/CD

* [x] **Docker multi-service**

  * [x] Ajouter services `redis`, `analytics`.
  * [x] Ajouter service `timescaledb`.
  * [x] Ajouter service `nlp_worker`.
  * [x] Health-check + restart policy `unless-stopped`.
* [x] **GitHub Actions**

  * [x] Linter + tests back (pytest) + tests front (vitest) → badge passing.
  * [x] Build images, pousser sur GHCR.

---

### 10. Sécurité & conformité

* [x] **Gestion clé API**

  * [x] Stockage dans `docker-compose.override.yml` (non versionné).
  * [x] Vérifier qu’aucune clé gratuite n’est commitée.
* [x] **Rate-limiting**

  * [x] Middleware FastAPI 429 si abuse (limite IP/user).
* [x] **Mentions légales / disclaimers**

  * [x] Ajouter disclaimer “données gratuites, peut comporter un décalage”.

---

### 11. Tests & QA

* [ ] **Tests de charge WebSocket**

  * [x] Prototype 20 clients × 1 symbol (<120 ms médiane, p99 < 300 ms)
  * [ ] Simuler 1 000 clients × 10 symbols.
  * [ ] Latence médiane < 120 ms, 99ᵉ centile < 300 ms à l'échelle.
* [ ] **Tests e2e Cypress**

  * [ ] Ouverture dashboard, changement timeframe, IA ajoute annotation.
  * [ ] Vérifier absence d’erreurs console.

---

### 12. Documentation & onboarding

* [x] **Guide “Getting started”** (README)

  * [x] `git clone`, `docker compose up`, URL front.
* [x] **Doc API** (`docs/api.md`)

  * [x] Endpoints REST + payloads WebSocket.
* [ ] **Tutorial vidéo (optional)**

  * [ ] 2 min pour montrer création d’un doc de recherche IA.

---

### 13. Petites améliorations / correctifs repérés

* [x] Refactor auth : passer JWT secret en variable d’environnement.
* [ ] Optimiser bundle front : code split sur la lib TradingView.
* [ ] Ajouter spinner “Live” quand le flux WebSocket est actif.
* [ ] Corriger warning “React key prop missing” dans liste watchlist.

---

### ✅ Objectif final

Lorsque **toutes les cases** sont cochées :

* Un utilisateur ouvre l’app, choisit un symbole, voit un graphique *live* à 5 min.
* Il peut demander à l’IA : “Montre-moi la dernière analyse fondamentale de $AAPL” ➜ l’agent crée un doc *fundamental_plus_strategy* avec tableau, graphique, callouts.
* Le dashboard reste fluide (< 300 ms de délai visuel) même sous charge.

---

### Historique

* 2024-11-24 : Création du fichier `AGENTS.md` avec la checklist fournie.
* 2024-11-24 : Ajout du micro-service analytics initial, WebSocket `/stream`, docker-compose et tests.
* 2025-08-06 : Implémentation du connecteur Yahoo Finance (protobuf + throttling) et mise à jour du service.
* 2025-08-06 : Ajout du connecteur Finnhub et sélection dynamique du flux temps réel.
* 2025-08-06 : Endpoints REST Alpha Vantage `/history` & `/fundamentals` avec cache Redis et rate limiting.
* 2025-08-06 : Ajout du scheduler APScheduler pour agréger les bougies et persistance SQLite.
* 2025-08-06 : Support Twelve Data pour `/history` et `/fundamentals` avec cache 24h.
* 2025-08-06 : Couche repository SQLite, endpoint `/candles` et tests unitaires.
* 2025-08-06 : SMA incrémental avec cache Redis et endpoint `/indicators`.
* 2025-08-06 : Ajout de l'EMA incrémental et tests de validation.
* 2025-08-07 : Implémentation de l'indicateur RSI incrémental avec stockage Redis et tests.
* 2025-08-07 : Ajout des indicateurs MACD et Bollinger Bands incrémentaux avec tests et endpoint.
* 2025-08-07 : Ajout du scraper RSS (Investing, CNBC, Bloomberg) avec stockage SQLite et scheduler 30s.
* 2025-08-07 : Ajout d'un middleware de rate limiting IP avec réponse 429 et tests.
* 2025-08-07 : Endpoint `/symbols` retournant la watchlist depuis SQLite et tests.
* 2025-08-07 : Scraper Reddit (VADER) pour sentiment et endpoint `/sentiment`.
* 2025-08-07 : Ajout du worker NLP RQ traitant `raw_posts` et service `nlp_worker`.
* 2025-08-07 : Route WebSocket `/ws/stream` avec souscriptions par symbole et heartbeat JWT.
* 2025-08-07 : Le secret JWT est désormais injecté via la variable d'environnement `JWT_SECRET`.
* 2025-08-07 : Ajout d'un disclaimer global “données gratuites, peut comporter un décalage” et test de présence.
* 2025-08-07 : Diagramme d'architecture, guide de démarrage et documentation API, ajout du workflow CI.
* 2025-08-08 : Ajout du service TimescaleDB avec healthchecks et restart policy, exposant `/health` pour les vérifications.
* 2025-08-08 : Mise en place des migrations Alembic pour `ticks`, `candles`, `news` et `sentiment` avec index `(symbol, ts)`.
* 2025-08-08 : Exemple `docker-compose.override.yml` pour gérer les clés API et mise à jour `.gitignore`.
* 2025-08-08 : Ajout du cache Redis pour ticks et bougies avec TTL adapté (1h/24h).
* 2025-08-08 : Workflow GitHub Actions build & push de l'image analytics vers GHCR.
* 2025-08-08 : Ajout du scraper Twitter via snscrape et intégration au pipeline NLP.
* 2025-08-08 : Définition des outils d'agent (`agent_tools`) et routeur de fonctions.
* 2025-08-08 : Stockage des recherches via table `research_docs` et API `/docs/{id}`.
* 2025-08-08 : Intégration d'OpenAI Functions pour exécuter automatiquement les outils de l'agent.
* 2025-08-08 : Ajout d'un test de latence du pipeline NLP garantissant un traitement < 1 min.
* 2025-08-08 : Prototype de test de charge WebSocket (20 clients, latence <120ms).
