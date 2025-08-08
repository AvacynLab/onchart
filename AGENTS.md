Parfait — j’ai **ouvert et inspecté** la version actuelle (`onchart-alpha-0.1 (2).zip`).
Voici **la TODO-list exhaustive à cocher**, **fichier par fichier**, pour intégrer *tous* les points pertinents (y compris les petites améliorations) de mon message précédent **en respectant votre archi actuelle**.

> **Lignes rouges trouvées dans le code actuel :**
>
> * Le **WS live** (`app/api/market/[symbol]/live/route.ts`) écoute un **EventEmitter in-memory** → **ne reçoit rien** du worker en prod (process différent).
> * Les **événements IA** (`lib/ai/event-engine.ts`) sont aussi **in-memory** → n’atteignent **pas** le navigateur.
> * Le **handler “chart”** existe… mais **n’est pas enregistré** dans `lib/artifacts/server.ts` (il y a un fallback import côté tool, mais pas de persistance via `saveDocument`).
> * `AssetSidebar` affiche des **placeholders** (pas branché aux routes fondamentaux/sentiment/news).
> * Le WS live **n’impose pas** `export const runtime = 'edge'`.

---

# ✅ À COCHER — CORRECTIONS & AJOUTS (par fichier)

## 0) Environnement & scripts

* [x] **`.env.example`**

  * [x] ➕ `REDIS_URL=redis://localhost:6379` (pour le bus temps réel).
  * [x] ✍️ Ajouter un commentaire “utilisé pour le pont worker ↔ API WS ↔ client”.
* [x] **`package.json`**

  * [x] ➕ deps : `"redis": "^5"` (ou `ioredis`, au choix — ci-dessous je pars sur `redis`).
  * [x] 🔧 Si besoin, ajouter script `dev:ws` (mais **gardez votre flux actuel**).

---

## 1) BUS TEMPS RÉEL (bridge inter-process)

### 1.1 Créer un bus Redis partagé

* [x] **`lib/market/bus.ts`** *(nouveau)*

  * [x] Implémenter un client pub/sub :

    ```ts
    import { createClient } from 'redis';
    export const CHANNEL_TICK = 'ticks';
    export const CHANNEL_CANDLE = 'candles';
    export const CHANNEL_AI = 'ai-events';

    const url = process.env.REDIS_URL!;
    export const pub = createClient({ url });
    export const sub = createClient({ url });

    export async function initBus() {
      if (!pub.isOpen) await pub.connect();
      if (!sub.isOpen) await sub.connect();
    }
    ```
  * [x] ✍️ JSDoc précisant : **unique source de vérité** pour tout ce qui part du worker.

### 1.2 Worker → publier les événements

* [x] **`scripts/market-worker.ts`**

  * [x] ➕ `import { initBus, pub, CHANNEL_TICK, CHANNEL_CANDLE } from '@/lib/market/bus'`
  * [x] Au **démarrage**, `await initBus()` (avec retry).
  * [x] À **chaque tick** inséré → `await pub.publish(CHANNEL_TICK, JSON.stringify({symbol, ts, price, volume}))`.
  * [x] À **chaque flush de bougie** (5m/15m/1h/4h/1d) → publier sur `CHANNEL_CANDLE` avec `{symbol, interval, open, high, low, close, volume, tsStart, tsEnd}`.
  * [x] ✅ **Ne touchez pas** au reste (agrégation, fallback REST) → **on garde votre archi**.

### 1.3 API WS → s’abonner & relayer au navigateur

* [x] **`app/api/market/[symbol]/live/route.ts`**

  * [x] ➕ `export const runtime = 'edge'` en tête du fichier.
  * [x] ➕ `import { initBus, sub, CHANNEL_TICK, CHANNEL_CANDLE } from '@/lib/market/bus'`
  * [x] `await initBus()` et **s’abonner** aux 2 canaux :

    * [x] Sur `CHANNEL_TICK`: parse JSON, **filtrer par `symbol`**, `server.send({type:'tick', data})`.
    * [x] Sur `CHANNEL_CANDLE`: parse JSON, **filtrer par `symbol` & `interval`**, `server.send({type:'candle', data})`.
  * [x] À la **fermeture WS** : `unsubscribe` proprement (éviter fuites).
  * [x] ❌ **Supprimer** la dépendance à `marketEvents` (in-memory) → **tout passe par Redis**.

---

## 2) ÉVÉNEMENTS IA (annotations, highlights)

### 2.1 Passer l’EventEmitter IA sur Redis

* [x] **`lib/ai/event-engine.ts`**

  * [x] ➕ `import { initBus, pub, sub, CHANNEL_AI } from '@/lib/market/bus'`.
  * [x] `broadcastAIEvent(event)` → `await initBus(); await pub.publish(CHANNEL_AI, JSON.stringify(event))`.
  * [x] `subscribeAIEvents` **côté serveur** peut rester pour tests **mais** marquez-le comme *server-only mock* (JSDoc) pour éviter confusion côté client.

### 2.2 Route WS dédiée aux events IA

* [x] **`app/api/ai/events/route.ts`** *(nouveau)*

  * [x] `export const runtime = 'edge'`.
  * [x] Upgrade WS, `await initBus()` puis `sub.subscribe(CHANNEL_AI, ...)`, `server.send(eventJSON)` **sans filtrage** (le client filtre si besoin par `symbol`).
  * [x] Unsubscribe à la fermeture.

### 2.3 Côté client : ne plus importer `node:events`

* [x] **`components/AIAnnotations.tsx`**

  * [x] ❌ **Retirer** `subscribeAIEvents` import (in-memory).
  * [x] ➕ Connexion à `new WebSocket('/api/ai/events')`.
  * [x] OnMessage → `applyAIEvent(chart, event)` (vous l’avez déjà) — **avec guard** sur `symbol` si vous voulez scope.
  * [x] ✅ Conserver l’API `applyAIEvent` et la map `levelColors`.

* [x] **`components/__tests__/AIAnnotations.test.tsx`**

  * [x] Mettre à jour le test : **mock** `WebSocket` et vérifier qu’un message `highlight-price` déclenche bien `chart.addShape`.

---

## 3) ARTIFACT “CHART” — ENREGISTREMENT & PERSISTENCE

### 3.1 Enregistrer le handler côté serveur

* [x] **`lib/artifacts/server.ts`**

  * [x] ➕ `import { chartDocumentHandler } from '@/artifacts/chart/server'`
  * [x] ➕ Rajouter `chartDocumentHandler` dans `documentHandlersByArtifactKind` (après `sheetDocumentHandler`).
  * [x] ✅ Laissez `artifactKinds` tel quel (il inclut déjà `'chart'`).

> **Pourquoi ?** Votre tool `create-document` *essaie* un import dynamique si le handler n’est pas listé, mais **ne sauvegarde pas** via `saveDocument` (c’est `createDocumentHandler` qui le fait). En l’enregistrant ici, vous obtenez **persistance** + **comportement homogène** avec les autres artifacts.

### 3.2 Assurer le flux de rendu côté client

* [x] **`artifacts/chart/client.tsx`** : **OK** (il écoute `data-chartConfig`).
* [x] **`artifacts/chart/server.ts`** : **OK** (stream config + JSON final).
* [x] **`artifacts/chart/server.test.ts`** : laisser, mais

  * [x] ➕ un test d’intégration **serveur** pour `saveDocument` via `lib/artifacts/server.ts` (vérifie que le doc est créé et persisté quand `kind='chart'`).

---

## 4) OUTILS DE L’AGENT (interaction interface & recherches)

### 4.1 Tools existants — brancher sur le nouveau transport

* [x] **`app/api/ai/highlight-price/route.ts`**

  * [x] Vérifier qu’il appelle bien `broadcastAIEvent` (qui publie maintenant sur Redis).
  * [x] Tester en local : un POST doit faire apparaître une annotation en live sur le chart.

### 4.2 Montrer un graphique précis (symbol + timeframe)

* [x] **`lib/ai/tools/get-chart.ts`**

  * [x] ✅ déjà OK : renvoie la spec (symbol/interval) — **rien à changer**.
  * [x] (Option) Autoriser `studies` (SMA/EMA/RSI) dans la spec pour un overlay auto (ChartWidget).

### 4.3 Création de “documents de recherche” (mêmes mécaniques que “create-document”)

* [ ] **Nouveaux artifacts** :

* [x] **`artifacts/research-opportunity/server.ts`** *(scan global ou par symbol ; résumés + liens + mini score)*
* [x] **`artifacts/research-opportunity/client.tsx`** *(rendu markdown + boutons “Ouvrir chart”)*
  * [x] **`artifacts/research-asset/server.ts`** *(analyse approfondie d’un asset/entreprise : fondamentaux + sentiment + technique)*
  * [x] **`artifacts/research-asset/client.tsx`**
  * [x] **`artifacts/research-fa-ta/server.ts`** *(analyse fondamentale/technique **avec** configuration de chart et **ébauche de stratégie**)*
  * [x] **`artifacts/research-fa-ta/client.tsx`**
  * [x] **`artifacts/research-fa-ta/server.test.ts`**
  * [x] **`artifacts/research-general/server.ts`** *(recherche libre plus/moins organisée — plan + sections)*
  * [x] **`artifacts/research-general/client.tsx`**
  * [x] **`artifacts/research-general/server.test.ts`**

* [x] **`lib/artifacts/server.ts`**

  * [x] ➕ importer & **enregistrer** le handler `research-asset`.
  * [x] ➕ importer & **enregistrer** le handler `research-opportunity`.
  * [x] ➕ importer les autres handlers et étendre `documentHandlersByArtifactKind`.
  * [x] ➕ étendre `artifactKinds` avec `'research-asset'` et `'research-opportunity'` (les autres restent à ajouter).

* [x] **`lib/ai/tools/create-document.ts`**

  * [x] ✅ Rien à casser (gère déjà les kinds via `artifactKinds`).
  * [x] ➕ Tests couvrant chaque nouveau kind (création OK + persistance OK).

* [x] **`lib/ai/tools/analyse-asset.ts`** *(existe déjà)*

  * [x] ➕ Option `emitArtifact: 'research-asset'` pour déclencher la **création d’un document** avec le contenu complet retourné.
* [x] Idem pour `scan-opportunities.ts` → `emitArtifact: 'research-opportunity'`.
  * [x] Nouveau tool `analyse-fa-ta.ts` → agrège fondamentaux + technique + **propose config de chart + stratégie** → crée `research-fa-ta`.
  * [x] Nouveau tool `research-general.ts` → **brief** + **plan** + **sections** + annexes → crée `research-general`.

---

## 5) FRONT — brancher la sidebar & solidifier le WS

### 5.1 Sidebar : consommer les routes (plus de placeholders)

* [x] **`components/AssetSidebar.tsx`**

  * [x] Onglet **Fundamentals** → fetch `/api/fundamentals/[symbol]`, afficher P/E, Rev, EPS (prendre ce qu’il y a dans `json`), `updatedAt`.
  * [x] Onglet **Sentiment** → fetch `/api/sentiment/[symbol]`, afficher **score moyen 24h** + **sparkline** (simple UL si vous ne voulez pas de chart).
  * [x] Onglet **News** → soit

    * [x] **(A)** créer route **`app/api/news/[symbol]/route.ts`** (select dans `news_sentiment`) & l’appeler ici,
    * [ ] **(B)** ou **étendre** `/api/sentiment` pour renvoyer aussi les headlines récentes.

### 5.2 WebSocket client : robustesse UX

* [x] **`hooks/useMarketSocket.ts`**

  * [x] ➕ **ping/keepalive** (envoyer un message “ping” toutes 20–30s si le serveur ne le fait pas).
  * [x] ✅ Throttle 5Hz : **garder** (déjà présent).
  * [x] Gérer **backoff** à la reconnexion (1s → 2s → 5s).

### 5.3 ChartWidget : overlays optionnels

* [x] **`components/ChartWidget.tsx`**

  * [x] (Option) Lire une **spec “studies”** depuis props ou metadata chart pour auto-ajouter EMA/RSI au montage.
  * [x] (Option) Bouton **“Demander une analyse IA”** : appelle `analyse-asset` et **crée un artifact** `research-asset`.

---

## 6) API REST complémentaires (si manquantes pour la sidebar)

* [x] **`app/api/news/[symbol]/route.ts`** *(nouveau si choisi en 5.1A)*

  * [x] `GET` : dernières N news (headline, url, score, ts).
  * [x] **Tests** unitaires.
* [x] **`app/api/market/[symbol]/candles/[interval]/route.ts`**

  * [x] ✅ déjà OK — rien à changer (tester avec 5m/15m/1h/4h/1d).

---

## 7) TESTS — couverture & intégration du bridge

### 7.1 Bridge Redis end-to-end

* [x] **`app/api/market/[symbol]/live/route.test.ts`**

   * [x] Mock `redis` → publier sur `CHANNEL_TICK`/`CHANNEL_CANDLE` et **attendre** que la route WS forwarde bien les messages (tick + candle).
   * [x] Vérifier **unsubscribe** à la fermeture (pas de “message leak” après `close`).

* [x] **`components/__tests__/AIAnnotations.test.tsx`**

   * [x] Mock `WebSocket` client → envoyer `highlight-price` et vérifier appel `chart.addShape`.

* [x] **`app/api/ai/events/route.test.ts`**

   * [x] Mock `redis` → publier sur `CHANNEL_AI` et vérifier que le WS forwarde bien les événements.

### 7.2 Artifacts de recherche


* [x] **`artifacts/*/server.test.ts`** (pour chacun des 4 nouveaux kinds)

  * [x] Test `onCreateDocument` → stream parts + contenu final non vide pour `research-asset`.
  * [x] Test via `lib/artifacts/server.ts` → **persistance** avec `saveDocument`.

### 7.3 Tools IA

* [x] **`lib/ai/tools/__tests__/analyse-asset.test.ts`**

  * [x] ➕ cas “emitArtifact” crée bien un `research-asset`.
* [x] **`lib/ai/tools/__tests__/scan-opportunities.test.ts`**

* [x] ➕ cas “emitArtifact” crée bien un `research-opportunity`.
* [x] **Nouveaux tests** pour `analyse-fa-ta.ts` & `research-general.ts`.

---

## 8) PETITES AMÉLIORATIONS (qualité & perfs)

* [x] **`app/api/market/[symbol]/live/route.ts`**

  * [x] **Backpressure** : si `server.bufferedAmount` > seuil → **drop** certains ticks (mais gardez les candles).
  * [x] **Try/catch** autour du parse JSON + logs minimalistes.

* [x] **`scripts/market-worker.ts`**

  * [x] **Retry** WS Yahoo avec jitter & **circuit-breaker** sur fallback REST (pour éviter de plomber les quotas).
  * [x] **Cap mémoire** des buffers intraday (ex. garder N ticks par fenêtre seulement).

* [x] **`lib/db/queries.ts`**

  * [x] Index déjà OK ; vérifier `LIMIT`/`ORDER BY` systématiques (vous le faites déjà 👍).

* [x] **`components/AssetSidebar.tsx`**

  * [x] **Suspense/loader** + **erreurs** user-friendly (éviter écran vide).

---

## 9) DOCUMENTATION

* [x] **`docs/DATA_FLOW.md`**

  * [x] ➕ schéma “worker → Redis → Next WS → navigateur”.
* [x] **`docs/AI_TOOLS.md`**

  * [x] ➕ section “tools de recherche” pour `analyse-asset` avec `emitArtifact` (autres kinds à documenter).
  * [x] Documentation `analyse-fa-ta` & `research-general`.
* [x] **`README.md`**

  * [x] ➕ “Comment lancer Redis en local” + sanity check pour voir les annotations IA en live.

---

# 🎯 Résultats attendus (critères de réussite)

* **Temps réel fiable** : un tick/candle publié par `scripts/market-worker.ts` apparaît **sous 200 ms** dans le chart via `/api/market/.../live`.
* **Annotations IA** : un POST sur `/api/ai/highlight-price` provoque **immédiatement** un label sur le graphique du symbole concerné.
* **Chart Artifact** : `create-document` avec `kind: 'chart'` **persiste** et **affiche** le graphique (symbol/timeframe/studies).
* **Sidebar vivante** : Fundamentals/Sentiment/News affichent des données réelles via vos routes existantes.
* **Recherches profondes** : l’agent peut **créer** des documents `research-*` (opportunités globales/symbole, analyse asset, FA+TA avec stratégie, recherche générale), **ouverts** automatiquement à l’écran.
* **Tests** : nouveaux tests **verts**, y compris l’intégration **Redis bridge** (pas de faux positifs in-memory).

---

Si vous validez, je peux enchaîner en 4 PRs courtes et ciblées :

1. **Bridge Redis** (bus + WS market + events IA + tests),
2. **Chart handler enregistré** (+ test persistance),
3. **Sidebar branchée** (fundamentals/sentiment/news),
4. **Artifacts de recherche + tools IA associés**.

---

### HISTORIQUE

* Initialisation du fichier et import de la TODO-list.
* Mise en place du bus Redis, connexion worker et routes WS, adaptation événements IA et tests.
* Enregistrement du handler "chart" avec persistance, refactor WebSocket annotations et tests associés.
* Branchements de la sidebar (fundamentals/sentiment/news), ajout de la route news et robustesse du client WebSocket.
* Ajout de la prise en charge des études techniques dans ChartWidget avec tests associés.
* Ajout du backpressure WS live, retry/jitter du worker avec circuit breaker et documentation Redis.
* Introduction de l'artifact `research-asset` (handler, client, tests), option `emitArtifact` pour `analyse-asset`, bouton d'analyse IA dans ChartWidget et script `dev:ws`.
* Ajout de l'artifact `research-opportunity` avec handler, client, enregistrement global, support `emitArtifact` pour `scan-opportunities` et tests associés.
* Ajout des artifacts `research-fa-ta` et `research-general`, enregistrement global, outils IA correspondants, documentation et batteries de tests couvrant persistance.
* Couverture complète de la route `candles` sur tous les intervalles supportés et validation des petites améliorations.
* Ajout d'un test d'intégration pour la route `ai/events` validant la diffusion Redis→WebSocket.
* Vérification de l'API `highlight-price`, ajout des `studies` à `get-chart` et tests de persistance `create-document` pour tous les artifacts de recherche.

* Exécution de la suite de tests Node (25 réussites) ; échec des tests e2e Playwright faute de dépendances système.
* Re-run node tests (25 pass); Playwright tests fail with server-only module error after installing dependencies.
