Voici la liste exhaustive et **cochable**, orientée “agent IA”, pour amener la base Vercel AI Chatbot vers le **dashboard bento** + agents financiers. C’est **fichier par fichier**, avec sous-étapes, objectifs clairs et petits snippets dès que ça devient un peu piégeux.

---

## app/layout.tsx

* [x] Remplacer le layout par une grille **sidebar qui pousse le contenu**

  * [x] Définir la variable CSS `--sidebar-w` (fermée `0px`, ouverte p.ex. `300px`).
  * [x] Grille 2 colonnes: `grid-template-columns: var(--sidebar-w, 0px) 1fr`.
  * [x] Transitions douces (columns/width) pour l’animation d’ouverture.
  * **Objectif :** l’ouverture de la sidebar **recompose** le bento sans overlay.

  ```tsx
  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="fr">
        <body className="h-dvh overflow-hidden">
          <div className="grid h-full" style={{ gridTemplateColumns: 'var(--sidebar-w, 0px) 1fr' }}>
            <aside id="sidebar" className="h-full overflow-y-auto border-r" />
            <main id="main" className="h-full overflow-hidden">{children}</main>
          </div>
        </body>
      </html>
    );
  }
  ```

---

## components/sidebar/Sidebar.tsx

* [x] Monter la sidebar dans `#sidebar`.
* [x] Ajouter un **bouton** (dans le header du bento) pour ouvrir/fermer :

  * [x] `document.documentElement.style.setProperty('--sidebar-w', '300px' | '0px')`.
  * **Objectif :** pas d’overlay; la grille s’adapte.

---

## app/page.tsx

* [x] Conserver l’accueil de la boilerplate, mais **rendre le bento**.
* [x] Préfetch tolérant (quotes/news) dans un `try/catch`.
* **Objectif :** éviter tout crash SSR si les data tombent.

  ```tsx
  import { Bento } from '@/components/bento/Bento';
  export default async function HomePage() { return <Bento />; }
  ```

---

## components/bento/Bento.tsx

* [x] Construire la **grille bento**: header, contenu, input docké.

  * [x] Ligne 1: `BentoHeader` (menu + titre asset + timeframes).
  * [x] Ligne 2: sous-grille 2 colonnes: **ChartCard** (1fr) | **colonne droite** (NewsCard au-dessus + AnalysesCard en dessous).
  * [x] Ligne 3: **ChatDock** sticky en bas, centré.
  * **Objectif :** correspondre au plan (images fournies) et rester fluide quand la sidebar change de largeur.

  ```tsx
  export function Bento() {
    return (
      <div className="h-full grid grid-rows-[auto_1fr_auto] gap-3 p-3">
        <BentoHeader />
        <div id="bento-content" className="grid grid-cols-[1fr_340px] gap-3 min-h-0">
          <ChartCard />
          <div className="grid grid-rows-[1fr_auto] gap-3 min-h-0">
            <NewsCard />
            <AnalysesCard />
          </div>
        </div>
        <ChatDock />
      </div>
    );
  }
  ```

---

## components/bento/BentoHeader.tsx

* [x] Bouton sidebar (ouvre/ferme).
* [x] Titre asset (symbol + nom).
* [x] Boutons **timeframe** compacts (1m / 5m / 1h / 4h / 1d) reliés au contexte d’asset.
* **Objectif :** contrôle global de l’asset courant.

---

## lib/asset/AssetContext.tsx

* [x] Créer un **contexte d’asset** partagé.

  * [x] State: `{ symbol, name, timeframe, panes, sync }`.
  * [x] Persist localStorage (`lastAsset`, `lastTF`).
  * [x] Exposer `setAsset`, `setTimeframe`, `setPanes`, `toggleSync`.
  * **Objectif :** une seule source de vérité pour l’asset/TF/vue multiple.

  ```tsx
  type AssetState = { symbol: string; name?: string; timeframe: '1m'|'5m'|'1h'|'4h'|'1d'; panes: 1|2|4; sync: boolean };
  const Ctx = createContext<...>(/* ... */);
  ```

---

## components/bento/ChatDock.tsx

* [x] Reprendre l’input chat du boilerplate et le **détacher** en dock bas (sticky).
* [x] Au **submit** :

  * [x] Créer/récupérer un `chatId` via l’API.
  * [x] Ajout temporaire de la classe `fading-out` sur `#bento-content` (CSS `opacity-0 transition`).
  * [x] `router.push('/chat/{chatId}')` et (optionnel) envoyer le message en “draft” avant navigation.
  * **Objectif :** l’envoi **fait disparaître** les cards puis emmène l’utilisateur dans le chat pour la réponse.

  ```tsx
  'use client';
  import { useRouter } from 'next/navigation';
  export function ChatDock() {
    const router = useRouter();
    async function onSend(text: string) {
      const chatId = await ensureChatId();
      document.getElementById('bento-content')?.classList.add('opacity-0');
      await sendDraft(chatId, text); // optionnel
      router.push(`/chat/${chatId}`);
    }
    return <DockedInput onSubmit={onSend} />;
  }
  ```

---

## components/bento/ChartCard.tsx + components/bento/ChartGrid.tsx

* [x] **ChartCard**

  * [x] Header: titre asset, boutons TF, **sélecteur de split** (1/2/4) et bouton **synchro**.
  * [x] Body: `ChartGrid` gère 1/2/4 charts.
* [x] **ChartGrid**

  * [x] Instancier `lightweight-charts` par pane.
  * [x] Fetch `/api/finance/ohlc?symbol=…&interval=…`.
  * [x] Synchro scroll/zoom quand `sync` est actif.
  * [x] Gérer les overlays via bus d’événements.
  * [x] Gérer les annotations via bus d’événements.
  * **Objectif :** mini-TradingView minimal, fluide.

  ```tsx
  export function ChartGrid({ panes, asset, timeframe }: Props) {
    const refs = useRef<HTMLDivElement[]>([]);
    useEffect(() => {
      // créer/détruire les charts selon "panes"
      // brancher OHLC + synchro
    }, [panes, asset.symbol, timeframe]);
    return (
      <div className={panes===1?'grid grid-cols-1': panes===2?'grid grid-cols-1 grid-rows-2':'grid grid-cols-2 grid-rows-2'} >
        {[...Array(panes)].map((_,i)=><div key={i} ref={el=>refs.current[i]=el!} className="min-h-0"/>) }
      </div>
    );
  }
  ```

---

## components/bento/NewsCard.tsx

* [x] Se synchroniser sur `useAsset()`.
* [x] Fetch `/api/finance/news?symbol=…` (cache 60s).
* [x] Liste scrollable; bouton “Résumer dans l’artefact”.
* [x] Implémenter l’action : POST `/api/finance/news/summary` pour créer un artefact d’analyse.
* **Objectif :** toujours montrer des news de l’asset courant.

---

## components/bento/AnalysesCard.tsx

* [x] Deux onglets: **Analyses** | **Stratégies**.
* [x] Charger via `/api/document/query?asset=SYMB&kind=analysis|strategy`.
* [x] Clic: ouvrir l’**artefact** (drawer ou page) ; CTA “Continuer avec l’agent”.
* **Objectif :** retrouver facilement ce que l’agent (ou l’utilisateur) a déjà produit.

---

## lib/ui/events.ts (typage strict du bus)

* [x] Remplacer les strings libres par un **discriminant typé**.
* [x] Ajouter l’événement **`ask_about_selection`** pour les interactions sur bougies/indicateurs.
* **Objectif :** sécurité de types côté tools et UI; pas de `any` caché.

  ```ts
  export type UIEvent =
    | { type:'show_chart'; payload:{ symbol:string; timeframe:string } }
    | { type:'add_overlay'; payload:{ pane:number; kind:'sma'|'ema'|'rsi'; params:any } }
    | { type:'focus_area'; payload:{ from:number; to:number } }
    | { type:'add_annotation'; payload:{ at:number; text:string } }
    | { type:'ask_about_selection'; payload:{ symbol:string; timeframe:string; at:number; kind:'candle'|'indicator'; meta?:any } };

  export const ui = createEventBus<UIEvent>();
  ```

---

## components/artifact/ArtifactViewer.tsx

* [x] Support **workflow** (étapes numérotées) et **chart inline**.
* [x] Dans les artefacts “chart” : activer les **interactions** (clic bougie → `ask_about_selection`).
* [x] “Ouvrir dans le chat” préremplit l’input avec le **contexte** (asset/TF/temps).
* **Objectif :** artefacts riches, interactifs, utiles comme livrables.

---

## lib/ai/tools-artifact.ts (nouveaux tools)

* [x] `artifact.workflow.create({ title, steps })` et `artifact.workflow.appendStep({ id, content })`.
* [x] `artifact.chart.annotate({ symbol, timeframe, overlays, annotations })` → émet aussi `ui.add_annotation`.
* **Objectif :** permettre à l’agent de **matérialiser** son raisonnement et ses graphiques dans un artefact.

---

## app/(chat)/api/document/query/route.ts

* [x] Endpoint pour lister les documents par `asset`, `timeframe?`, `kind?`, `limit/offset`.
* [x] Retour minimal: `{ id, title, kind, createdAt }`.
* **Objectif :** alimenter la **AnalysesCard** proprement.

  ```ts
  export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    // lire asset/kind/...
    // requête Drizzle
    return Response.json({ items, total });
  }
  ```

---

## app/(chat)/api/finance/news/route.ts

* [x] Agréger les flux (Yahoo/RSS spécifiques) avec TTL 60s.
* [x] Normaliser `{ title, url, source, publishedAt }[]`.
* **Objectif :** NewsCard stable, même si une source tombe.

---

## app/(chat)/api/finance/quote/route.ts (correctif 502)

* [x] **Ajouter le fallback Stooq** pour equities (daily).
* [x] Crypto: fallback Binance (2 klines 1m) si Yahoo échoue.
* [x] Cache: 15s intraday, 60s daily; **option DEV** ajouter `source` dans la réponse.
* **Objectif :** `/api/finance/quote` répond 200 pour AAPL/MSFT/BTC-USD malgré Yahoo 5xx.

  ```ts
  // imports fetchDailyStooq + fetchKlinesBinance
  try {
    const quote = await fetchQuoteYahoo(symbol);
    // ...
  } catch {
    if (isCrypto(symbol)) { /* Binance 1m x2 -> REG */ }
    try { /* Stooq daily -> CLOSED */ } catch {}
    return new Response(JSON.stringify({ error:'failed to fetch quote' }), { status:502 });
  }
  ```

---

## app/(chat)/api/finance/ohlc/route.ts

* [x] Utiliser `INTRADAY_TTL_MS` / `DAILY_TTL_MS` de `lib/finance/cache.ts` (ne plus hardcoder).
* [x] Fallbacks identiques à quote (Yahoo → Binance/Stooq).
* **Objectif :** cohérence TTL et robustesse.

---

## lib/finance/live.ts

* [x] **Base URL SSR** robuste derrière proxy/Codespaces :

  * [x] Lire `headers()` pour `x-forwarded-host` et `x-forwarded-proto`.
  * [x] Fallback `NEXT_PUBLIC_VERCEL_URL` puis `http://localhost:3000`.
* **Objectif :** terminer les 502 “proxy”.

  ```ts
  import { headers } from 'next/headers';
  const h = typeof window==='undefined' ? headers() : null;
  const host = h?.get('x-forwarded-host'); const proto = h?.get('x-forwarded-proto') ?? 'http';
  const baseUrl = typeof window==='undefined'
    ? host ? `${proto}://${host}` 
      : process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
      : 'http://localhost:3000'
    : '';
  ```

---

## lib/finance/sources/binance.ts

* [x] Exposer `toBinancePair('BTC-USD') -> 'BTCUSDT'` proprement (pas `+ 'T'`).
* [x] `fetchKlinesBinance(pair, '1m', 2)` retourne un type stable `{ openTime, close, high, low }[]`.
* **Objectif :** calcul de variation fiable.

---

## lib/finance/sources/stooq.ts

* [x] Garantir **au moins 2 bougies**; sinon jeter (équity fallback sinon impossible).
* [x] Prévoir mapping de tickers si besoin (`toStooqTicker`).
* **Objectif :** fallback daily solide.

---

## lib/finance/symbols.ts

* [x] `normalizeSymbol` retourne `{ symbol, yahoo, binance, assetClass }`.
* [x] `isCryptoSymbol`, `toBinancePair`, `toStooqTicker` centralisés.
* **Objectif :** logique de mapping **unique** pour tout le code.

---

## lib/finance/cache.ts

* [x] Exporter `INTRADAY_TTL_MS=15_000`, `DAILY_TTL_MS=60_000`.
* [x] Vérifier usages dans `quote/ohlc`.
* **Objectif :** TTL cohérents partout.

---

## i18n/request.ts (corriger le MISSING_MESSAGE)

* [x] Charger par **namespace** (`messages: { common, dashboard, finance, chat }`) au lieu de spread racine.
* **Objectif :** permettre `useTranslations('dashboard.prices')` & co.

  ```ts
  export default getRequestConfig(async () => {
    const activeLocale = /* détection cookie/lang */;
    return {
      locale: activeLocale,
      messages: {
        common:    (await import(`../messages/${activeLocale}/common.json`)).default,
        dashboard: (await import(`../messages/${activeLocale}/dashboard.json`)).default,
        finance:   (await import(`../messages/${activeLocale}/finance.json`)).default,
        chat:      (await import(`../messages/${activeLocale}/chat.json`)).default,
      }
    };
  });
  ```

---

## i18n/messages/fr/dashboard.json et en/dashboard.json

* [x] Ajouter/compléter :

  * [x] `"prices.title"`, `"open"`, `"closed"`, `"offline"`, `"retry"`.
  * [x] `"bento.news"`, `"bento.analyses"`, `"bento.split"`, `"bento.sync"`.
* **Objectif :** plus aucun `MISSING_MESSAGE` + labels pour les nouvelles UI.

---

## app/(chat)/page.tsx ou /chat/[id]/page.tsx

* [x] Supporter `?anchor=` (symbol, timeframe, timestamp) pour préremplir l’input chat.
* [x] Afficher un **chip** de contexte au dessus de l’input.
* **Objectif :** poser des questions “sur une bougie précise” depuis le bento/artefact.

---

## lib/ai/tools-finance.ts

* [x] Quand un tool **sélectionne** une bougie/zone, émettre `ui.ask_about_selection` **et** enrichir le message assistant du contexte (symbol/tf/ts).
* [x] Quand le tool **produit** une stratégie/étude: créer un **artefact** `analysis`/`strategy` avec metadata `{ asset_symbol, timeframe, indicators, annotations }`.
* **Objectif :** fermer la boucle agent → artefact → consultation dans la card.

---

## app/(chat)/api/chat/route.ts

* [x] Envelopper `DataSourceError` en message assistant propre (pas de stack à l’utilisateur).
* [x] Contrôle simple du **quota invité** avec message i18n.
* **Objectif :** UX nette même si une source externe tombe.

---

## styles (globals.css / tailwind)

* [x] Classe `.fading-out { opacity:0; transition: opacity .2s; }`.
* [x] Cards avec `min-h-0` dans les conteneurs scrollables (évite les overflows).
* [x] Contraste des couleurs (variations vert/rouge) conforme à l’accessibilité.
* **Objectif :** pas d’artefacts visuels.

---

## Tests unitaires

* [x] `symbols.test.ts` : `normalizeSymbol`, `isCryptoSymbol`, `toBinancePair`, `toStooqTicker`.
* [x] `stooq.test.ts` : 1 bougie ⇒ erreur ; ≥2 ⇒ variation correcte.
* [x] `events.test.ts` : `UIEvent` discriminé, pas d’émission invalide.
* [x] `i18n-loader.test.ts` : `messages.dashboard.prices.title` présent après **loader réel** (pas mocké).
* [x] `asset-context.test.tsx` : état par défaut du contexte asset exposé.

---

## Tests d’intégration (API)

* [x] `quote.fallback.test.ts` :

  * [x] Mock Yahoo 502 → **BTC-USD** via Binance = 200.
  * [x] Mock Yahoo 502 → **AAPL** via Stooq = 200.
  * [x] Tous échouent → 502.
* [x] `ohlc.fallback.test.ts` : même logique + TTL intraday/daily.
* [x] `news.route.test.ts` : renvoie news normalisées; fallback si source 1 tombe.
* [x] `document.query.test.ts` : filtre par `asset`, `kind`, pagination.

---

## Tests E2E (Playwright)

* [x] `home-bento.spec.ts` :

  * [x] Sidebar open/close **pousse** la grille; input chat reste fixe.
  * [x] Split 1→2→4 fonctionne; synchro TF ok.
  * [x] Envoi message → cards disparaissent → navigation vers chat → la réponse arrive.
* [x] `artifact-interact.spec.ts` :

  * [x] Ouvrir artefact “chart” → clic bougie → input chat prérempli avec ancre → réponse contextualisée.

---

## Docs & config

* [x] **README** : expliquer bento, agents, artefacts enrichis, fallbacks data et TTL.
* [x] **.env.local** : variables clés (NEXTAUTH_SECRET, POSTGRES_URL, NEXT_PUBLIC_VERCEL_URL si besoin).
* **Objectif :** onboarding sans surprises.

---

## Petites gardes-fous perfs

* [x] Debounce 200–300ms sur les changements rapides de TF/asset pour éviter le spam réseau.
* [x] Nettoyage des listeners charts à l’unmount; `requestAnimationFrame` pour updates fréquentes.
* [x] Limiter `panes` à 4 et la densité d’annotations.

---

### Rappels de correctifs prioritaires bloquants

* [x] **i18n/request.ts** : namespacer les messages (sinon `MISSING_MESSAGE`).
* [x] **/api/finance/quote** : fallback **Stooq** equities (sinon 502).
* [x] **lib/finance/live.ts** : baseUrl SSR via `x-forwarded-*` (sinon 502 derrière proxy).

Ces trois éléments débloquent l’affichage de la home, la stabilité des quotes et la navigation en environnements proxifiés. Ensuite, implémente le bento (Bento.tsx, ChartCard, ChatDock) et branche les cards News/Analyses, puis enrichis l’artefact et les tools pour boucler le workflow agent → artefact → interaction.

## Historique

* 2025-02-15: reset du fichier AGENTS.md et import de la liste de tâches.
* 2025-02-15: mise à jour du layout avec grille sidebar, ajouts de traductions bento et test i18n-loader.
* 2025-08-17: ajout AssetContext, Bento scaffold (header, grid, chat dock), Sidebar avec toggle, style fading-out et test asset-context.
* 2025-08-17: Home prefetch tolérant, ChatDock crée le chat via API et envoie le draft, `min-h-0` sur les cards scrollables, utilitaire `createChatDraft` et test associé.
* 2025-08-17: centralisation des symboles finance, renommage des TTL cache et ajout du test `symbols`.
* 2025-08-18: prise en charge du paramètre `anchor` dans les pages chat, affichage du chip de contexte et tests d'ancrage.
* 2025-08-18: bus d'événements typé avec `ask_about_selection` et test `events`.
* 2025-08-18: normalisation des flux news, NewsCard connectée et test du routeur/news.
* 2025-08-18: amélioration du mappage Binance (`toBinancePair`), typage des klines et tests associés; complétion du fallback Stooq.
* 2025-08-18: ajout de `ui.ask_about_selection` dans les outils finance et test de l'émission d'événement.
* 2025-08-19: tests d'intégration des routes quote/ohlc avec vérification des TTL intraday/daily.
* 2025-08-19: ajout de l'endpoint `/api/document/query`, mise en place de l'AnalysesCard tabulée et test `document.query`.
* 2025-08-20: implémentation de ChartCard/ChartGrid avec lightweight-charts, synchro et annotations via bus.
* 2025-08-20: quota invité chat + DataSourceError transformé en message assistant, tests d'intégration associés.
* 2025-08-21: persistence des stratégies/analyses en artefacts avec métadonnées et tests associés.
* 2025-08-21: ajout couleurs accessibles positive/négative, mise à jour README et `.env.local.example`.
* 2025-08-22: ajout d'un hook `useDebounce` pour temporiser les changements d'asset/timeframe, annulation des fetchs OHLC et limitation des annotations dans ChartGrid.
* 2025-08-22: gestion des overlays via bus d'événements dans ChartGrid et fonction `computeOverlay` testée.
* 2025-08-23: ajout ArtifactViewer interactif, outils d'artefact pour workflows et annotations, tests unitaires associés.
* 2025-08-24: ajout du test E2E `home-bento.spec.ts` validant le push de la grille, les splits 1/2/4 et l'envoi de message avec navigation vers le chat.
* 2025-08-25: ouverture d'artefacts via l'AnalysesCard, bouton "Continuer avec l’agent" et ajout du test E2E `artifact-interact.spec.ts`.
* 2025-08-26: implémentation du résumé des news en artefact via `/api/finance/news/summary` et action depuis la NewsCard.
* 2025-08-26: installation des dépendances Playwright et tentative d'exécution de `pnpm test:e2e`.
* 2025-08-26: vérification finale des tests; unit OK, e2e échouent faute de navigateurs.
* 2025-08-26: localisation du bouton de résumé des news et ajout du test `news-card`.
* 2025-08-26: installation des navigateurs Playwright, tentative d'exécution des tests e2e et ajout de la doc d'installation dans le README.
