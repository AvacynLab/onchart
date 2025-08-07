## 📋 Checklist détaillée des tâches à réaliser

*(cochez chaque case au fur et à mesure ; les sous-tâches apparaissent en retrait)*

---

### 1. Mise à jour de l’architecture générale

* [ ] **Valider l’arborescence actuelle**

  * [ ] Confirmer la séparation `frontend/`, `backend/`, `services/`, `docker-compose.yml`.
  * [ ] Mettre à jour le diagramme d’architecture (README) avec les nouveaux flux temps réel.
  * [ ] Objectif : quiconque ouvre le dépôt comprend le parcours d’un tick jusqu’au navigateur.

* [ ] **Ajouter le micro-service `analytics`** (FastAPI + WebSocket)

  * [ ] Créer le dossier `services/analytics/` avec `Dockerfile`.
  * [ ] Configurer un *entrypoint* asynchrone qui :

    * [ ] Se connecte aux flux WebSocket publics (Yahoo, Finnhub) et publie les ticks.
    * [ ] Expose un WebSocket interne `/stream` pour le front.
  * [ ] Ajouter `analytics` au `docker-compose.yml` (réseau + volumes).
  * [ ] Objectif : isoler la partie temps réel et pouvoir la scaler indépendamment.

---

### 2. Collecte de données (marché)

* [ ] **Implémenter le connecteur WebSocket Yahoo Finance**

  * [ ] Décoder les messages protobuf/base64.
  * [ ] Mapper vers un schéma commun `{symbol, ts, price, volume}`.
  * [ ] Gérer la reconnexion automatique.
  * [ ] Logique de *throttling* si > N ticks/s.

* [ ] **Connecteur REST Alpha Vantage / Twelve Data (free tiers)**

  * [ ] Endpoint *historique* (`GET /history`) – batching symbol × intervalle.
  * [ ] Endpoint *fundamental* (`GET /fundamentals`) – ratios, états financiers.
  * [ ] Caching 24 h côté service (Redis).
  * [ ] Objectif : respecter les quotas gratuits (< 5 req/min).

* [ ] **Scheduler d’agrégation**

  * [ ] Cron async (APScheduler) qui construit les bougies 5 min, 15 min, 1 h, 4 h, 1 D.
  * [ ] Stocker les bougies dans la TSDB (TimescaleDB ou SQLite+index si alpha).

---

### 3. Collecte de données (sentiment & news)

* [ ] **Scraper flux RSS (Investing, CNBC, Bloomberg)**

  * [ ] Parser titre + résumé + horodatage → table `news`.
  * [ ] Lancer toutes les 30 s (limite 20 req/min/site).
* [ ] **Scraper Reddit et Twitter (API ou HTML fallback)**

  * [ ] Recherche sur `r/WallStreetBets`, `r/stocks`, hashtags `$AAPL`…
  * [ ] Nettoyer texte → analyse VADER + stockage score sentiment.
* [ ] **Pipeline NLP**

  * [ ] Ajouter `nlp_worker.py` (Celery/RQ) qui :

    * [ ] Écoute la file `raw_posts`.
    * [ ] Calcule `sentiment_score` et `subjectivity`.
    * [ ] Publie dans `sentiment` table.
* [ ] Objectif : latence < 1 min entre publication et score disponible.

---

### 4. Traitement temps réel & indicateurs

* [ ] **Stream builder**

  * [ ] À chaque tick, mettre à jour :

    * [ ] Bougie en formation (cache mémoire).
    * [ ] Indicateurs incrémentaux (SMA, EMA, RSI, MACD, BBands).
  * [ ] Utiliser `ta-lib` en mode rolling / update only last row.
* [ ] **Écrire la couche repository**

  * [ ] Interface `get_candles(symbol, interval, limit)` (TSDB).
  * [ ] Interface `get_indicator(symbol, interval, name)` (cache Redis).
* [ ] **Tests unitaires**

  * [ ] Vérifier qu’un flux de 100 ticks génère la bonne bougie 5 min.
  * [ ] Comparer indicateur incrémental vs recalcul complet (< 0.1 % erreur).

---

### 5. Stockage & performance

* [ ] **Choix TSDB**

  * [ ] Essayer `TimescaleDB` (PostgreSQL ext) – rapatriement docker.
  * [ ] Migration script `alembic` pour table `ticks`, `candles`, `news`, `sentiment`.
  * [ ] Index composites `(symbol, ts DESC)`.
* [ ] **Cache mémoire pour hottest symbols**

  * [ ] Redis `LRU` 1 Go – dernier million de ticks.
  * [ ] TTL adapté à l’intervalle (ex. ticks 1 h, bougies 24 h).

---

### 6. API backend (FastAPI)

* [ ] **Routes REST**

  * [ ] `GET /symbols` → métadonnées / watchlist de l’utilisateur.
  * [ ] `GET /candles/{symbol}/{interval}` → JSON OHLCV compressé.
  * [ ] `GET /indicators/{symbol}/{interval}` → valeurs calculées.
  * [ ] `GET /sentiment/{symbol}` → score time-series.
* [ ] **Route WebSocket**

  * [ ] `/ws/stream?symbols=AAPL,TSLA&interval=5m` → push JSON delta.
  * [ ] Heartbeat + re-auth JWT.

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

* [ ] **Définir les “tools” de l’agent**

  * [ ] `show_chart(symbol, interval, from, to)` → push event au front.
  * [ ] `annotate(ts, price, text, style)` → crée un `AiCallout`.
  * [ ] `create_research(type, payload)` → génère un doc (même mécanisme que canva docs).
* [ ] **Implémenter le routeur de fonctions**

  * [ ] Fichier `agent_tools.py` déclarant les schemas JSON.
  * [ ] Langchain/OpenAI Functions qui autorise l’appel automatique.
* [ ] **Types de recherches**

  * [ ] `opportunity_scan` (multi-marché).
  * [ ] `currency_focus` (FX/crypto).
  * [ ] `asset_deep_dive` (entreprise).
  * [ ] `fundamental_plus_strategy` (analyse F+T, chart, plan).
  * [ ] `structured_general` (requête libre structurée).
* [ ] **Stockage des recherches**

  * [ ] Table `research_docs` (id, user_id, type, json, ts_created).
  * [ ] API `/docs/{id}` pour récupérer/éditer.

---

### 9. DevOps & CI/CD

* [ ] **Docker multi-service**

  * [ ] Ajouter services `redis`, `timescaledb`, `analytics`, `nlp_worker`.
  * [ ] Health-check + restart policy `unless-stopped`.
* [ ] **GitHub Actions**

  * [ ] Linter + tests back (pytest) + tests front (vitest) → badge passing.
  * [ ] Build images, pousser sur GHCR.

---

### 10. Sécurité & conformité

* [ ] **Gestion clé API**

  * [ ] Stockage dans `docker-compose.override.yml` (non versionné).
  * [ ] Vérifier qu’aucune clé gratuite n’est commitée.
* [ ] **Rate-limiting**

  * [ ] Middleware FastAPI 429 si abuse (limite IP/user).
* [ ] **Mentions légales / disclaimers**

  * [ ] Ajouter disclaimer “données gratuites, peut comporter un décalage”.

---

### 11. Tests & QA

* [ ] **Tests de charge WebSocket**

  * [ ] Simuler 1 000 clients × 10 symbols.
  * [ ] Latence médiane < 120 ms, 99ᵉ centile < 300 ms.
* [ ] **Tests e2e Cypress**

  * [ ] Ouverture dashboard, changement timeframe, IA ajoute annotation.
  * [ ] Vérifier absence d’erreurs console.

---

### 12. Documentation & onboarding

* [ ] **Guide “Getting started”** (README)

  * [ ] `git clone`, `docker compose up`, URL front.
* [ ] **Doc API** (`docs/api.md`)

  * [ ] Endpoints REST + payloads WebSocket.
* [ ] **Tutorial vidéo (optional)**

  * [ ] 2 min pour montrer création d’un doc de recherche IA.

---

### 13. Petites améliorations / correctifs repérés

* [ ] Refactor auth : passer JWT secret en variable d’environnement.
* [ ] Optimiser bundle front : code split sur la lib TradingView.
* [ ] Ajouter spinner “Live” quand le flux WebSocket est actif.
* [ ] Corriger warning “React key prop missing” dans liste watchlist.

---

### ✅ Objectif final

Lorsque **toutes les cases** sont cochées :

* Un utilisateur ouvre l’app, choisit un symbole, voit un graphique *live* à 5 min.
* Il peut demander à l’IA : “Montre-moi la dernière analyse fondamentale de \$AAPL” ➜ l’agent crée un doc *fundamental_plus_strategy* avec tableau, graphique, callouts.
* Le dashboard reste fluide (< 300 ms de délai visuel) même sous charge.

Passez en revue, ajustez si nécessaire, puis on pourra prioriser et créer les premières issues/PR !

---

### Historique

* 2024-11-24 : Réinitialisation du fichier `AGENTS.md` et import de la checklist fournie.
* 2024-11-24 : Ajout d’un fallback en mémoire pour `createStreamId`/`getStreamIdsByChatId` lorsque la base de données est absente.
