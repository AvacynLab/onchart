Parfait — je reprends l’état **actuel** du repo, les logs de tests, et la vision produit (bento + agents + artefacts) pour te livrer une TODO exhaustive, **fichier par fichier**, avec sous-étapes, objectifs attendus et snippets quand c’est piégeux.

---

# Blocage prioritaire E2E : erreur `clientModules` (PPR)

* [x] **app/(chat)/layout.tsx** — Neutraliser PPR côté segment “chat”.

  * **Problème** : `export const experimental_ppr = true;` force PPR pour ce segment et **outrepasse** la désactivation globale définie dans `next.config.ts` pour Playwright. D’où `TypeError: Cannot read properties of undefined (reading 'clientModules')` en prod build.
  * **Action** : retirer l’export ou le fixer à `false`.
  * **Objectif** : rendre le build de test stable sans PPR.
  * **Snippet** :

    ```tsx
    // app/(chat)/layout.tsx
    // ❌ Supprimer cette ligne
    // export const experimental_ppr = true;

    // ✅ ou bien forcer off tant que les E2E sont instables avec PPR
    export const experimental_ppr = false;
    ```

* [x] **playwright.config.ts** — Démarrer l’app pré-construite avec l’ENV Playwright.

  * **Problème** : auparavant, `webServer.command` reconstruisait l’app avant chaque test.
  * **Action** : démarrer uniquement la build générée en amont (`pretest:e2e`), en passant `PLAYWRIGHT=True` à `next start`.
  * **Objectif** : réutiliser le build PPR-off et réduire le temps de lancement.
  * **Snippet** :

    ```ts
    // playwright.config.ts
    webServer: {
      command: 'PLAYWRIGHT=True pnpm start -p 3110',
      port: 3110,
      reuseExistingServer: false,
      env: { PLAYWRIGHT: 'True', OTEL_SDK_DISABLED: '1' },
      timeout: 300_000,
    },
    ```

* [x] **package.json** — Rendre l’intention explicite côté script CI.

  * **Action** : installer Chromium et construire l’app avec `PLAYWRIGHT=True` avant d’exécuter les tests.
  * **Snippet** :

    ```json
    {
      "scripts": {
        "pretest:e2e": "pnpm exec playwright install --with-deps chromium && rm -rf .next && PLAYWRIGHT=True pnpm build",
        "test:e2e": "OTEL_SDK_DISABLED=1 PLAYWRIGHT=True pnpm exec playwright test"
      }
    }
    ```

* [x] **next.config.ts** — Laisser la garde-fou, mais documenter le piège du segment PPR.

  * **Action** : commentaire clair pour éviter toute régression future (quelqu’un remettrait `experimental_ppr = true` dans un segment).
  * **Objectif** : pas de retour du bug “clientModules”.

---

# Page d’accueil (bento) : chat dock + transitions + redirection

* [x] **app/page.tsx** — Ajouter l’input **fixe** centrée en bas (dock), visible sur `/`.

  * **Problème** : les tests E2E cherchent `data-testid="multimodal-input"` sur `/`, or l’input n’y est pas montée → timeouts.
  * **Action** : réutiliser `components/multimodal-input.tsx` en dock, centré bas, non déplaçable.
  * **Objectif** : respecter l’UX voulue et débloquer les tests `chat.*` qui attendent l’input sur `/`.
  * **Snippet** :

    ```tsx
    // app/page.tsx (extrait JSX à la fin du <main>)
    import MultimodalInput from '@/components/multimodal-input';
    import { useRouter } from 'next/navigation';
    import { useState } from 'react';

    export default function HomePage() {
      const router = useRouter();
      const [fading, setFading] = useState(false);

      async function createAndGo(message: string, attachments?: File[]) {
        setFading(true); // -> déclenche l’opacité des tuiles
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: message }] }),
        });
        const { id } = await res.json();
        router.push(`/chat/${id}`);
      }

      return (
        <>
          {/* ...BentoGrid ici... */}
          <div
            className={
              'pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-6'
            }
          >
            <div className="pointer-events-auto w-full max-w-3xl px-4">
              <MultimodalInput
                data-testid="multimodal-input"
                onSubmit={async (msg, atts) => {
                  await createAndGo(msg, atts);
                }}
                // facultatif : « mini » mode visuel
                size="compact"
              />
            </div>
          </div>

          {/* Classe CSS pour fade-out des tuiles */}
          <style jsx global>{`
            .bento-grid {
              transition: opacity 200ms ease;
              opacity: ${fading ? 0 : 1};
            }
          `}</style>
        </>
      );
    }
    ```

* [x] **components/bento/ChatDock.tsx** — Réutiliser `MultimodalInput` pour permettre les pièces jointes dès l’accueil et garder un comportement aligné avec la page de chat.

* [x] **components/dashboard/BentoGrid.tsx** — Envelopper la grille avec une classe stable.

  * **Action** : ajouter `className="bento-grid"` à la racine pour que le fade-out ci-dessus fonctionne.
  * **Objectif** : l’envoi d’un message fait disparaître les éléments et on atterrit sur `/chat/:id`.

---

# Carte “Cours” + split 1/2/4 + timeframe + titre à gauche

* [x] **components/finance/ChartGrid.tsx**, **ChartToolbar.tsx**, **ChartPanel.tsx**



  * **État** : ces composants existent et gèrent timeframe, type de série et indicateurs. Split 2/4 est prévu (`ChartGrid`).
  * **Actions** :

    * [x] Injecter `ChartGrid` dans une **card** dédiée du bento, avec un header contenant :

      * le **titre** (symbole) en haut à gauche,
      * les **boutons timeframe** (via `ChartToolbar`) en compact, à côté.
    * [x] Passer la **source OHLC** via `/app/(chat)/api/finance/ohlc/route.ts` (déjà présent) et gérer le symbole sélectionné (voir section “État de sélection”).
    * [x] Vérifier le **rendu responsive** dans la card (constraints `minHeight`, `ResizeObserver`).
  * **Objectif** : “mini tradingview” minimal et propre dans la tuile.

* [x] **AttentionLayer.tsx** (overlay d’attention/annotation)

  * **Action** : confirmer la propagation d’événements (click/hover) vers l’agent via `/api/finance/attention`.
  * **Objectif** : permettre à l’utilisateur d’interroger l’agent **sur une bougie précise** (voir aussi artefacts).

---

# Carte “News” synchronisée avec l’asset affiché

* [x] **components/dashboard/tiles/NewsTile.tsx**

  * **État** : route `/api/finance/news` opérationnelle.
  * **Actions** :

    * [x] Recevoir un `symbol` prop et re-fetcher les news lorsqu’il change.
    * [x] Afficher un bouton “résumer” (localisé) si l’agent doit produire un condensé (tests existants).
  * **Snippet** :

    ```tsx
    // components/dashboard/tiles/NewsTile.tsx (extrait)
    export default function NewsTile({ symbol }: { symbol: string }) {
      const [items, setItems] = useState<NewsItem[]>([]);
      useEffect(() => {
        let cancelled = false;
        (async () => {
          const res = await fetch(`/api/finance/news?symbol=${encodeURIComponent(symbol)}`);
          if (!cancelled && res.ok) setItems(await res.json());
        })();
        return () => { cancelled = true; };
      }, [symbol]);
      // ...render list
    }
    ```

---

# Carte “Analyses & Stratégies” (consultation et renvoi vers artefacts)

* [x] **components/dashboard/tiles/AnalysesTile.tsx** + **AnalysesTileClient.tsx**

  * **État** : composant présent, import dynamique `ssr: false`.
  * **Actions** :

    * [x] Lister les **analyses** et **stratégies** liées à l’asset actif (filtre par `symbol`).
    * [x] Cliquer ouvre l’**artefact** correspondant (voir section Artefacts), ou focus le chart si contextuel.
    * [x] Assurer des `data-testid` cohérents avec `tests/e2e/artifact-interact.spec.ts` (`analyses-card`, bouton “Sample analysis”).
  * **Objectif** : consultation rapide, cohérente avec la page chat.

* [x] **tests/bento/analyses-card.test.tsx** — enlever le `SKIP` dès que le chargement est stable

  * **Action** : si besoin, mocker `next/dynamic` ou monter la version client dans JSDOM.
  * **Objectif** : couvrir la tuile en unit tests.

---

# État global “asset/timeframe” partagé entre tuiles

* [x] **components/dashboard/BentoGrid.tsx** (ou un petit store React Context local à la Home)

  * **Actions** :

    * [x] Introduire un **state** `selectedSymbol` et `timeframe`, source de vérité pour :

      * la carte **Cours** (`ChartGrid`),
      * la carte **News**,
      * la carte **Analyses & Stratégies**.
    * [x] Offrir un setter `onSymbolChange` (depuis la toolbar ou une recherche).
  * **Snippet** :

    ```tsx
    // components/dashboard/BentoGrid.tsx (idée)
    export function BentoGrid() {
      const [symbol, setSymbol] = useState('AAPL');
      const [timeframe, setTimeframe] = useState<'1m'|'5m'|'1h'|'1d'>('1h');

      return (
        <div className="bento-grid grid ...">
          <Card>
            <Header>
              <h3>{symbol}</h3>
              <ChartToolbar
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                // ...autres callbacks
              />
            </Header>
            <ChartGrid symbol={symbol} timeframe={timeframe} onSymbolChange={setSymbol} />
          </Card>

          <Card>
            <NewsTile symbol={symbol} />
          </Card>

          <Card data-testid="analyses-card">
            <AnalysesTile symbol={symbol} />
          </Card>
        </div>
      );
    }
    ```

---

# Sidebar : ouverture au même niveau que le bento et push de la grille

* [x] **components/ui/sidebar.tsx**, **components/app-sidebar.tsx**

  * **État** : composants présents (radix-like), `SidebarInset` est disponible.
  * **Actions** :

    * [x] Vérifier que la **Home** est rendue dans `SidebarInset` pour que la grille soit **poussée** latéralement lors de l’ouverture.
    * [x] S’assurer que le dock du chat **suit** le contenu (position fixe + `inset-x-0` suffit si layout base bouge).
  * **Objectif** : l’ouverture n’écrase pas la grille, elle **recalcule** la largeur dynamiquement (cf. test `dashboard.menu tile toggles finance actions`).

---

# Artefacts : chart enrichi, indicators, annotations & interaction

* [x] **components/artifact.tsx** + **components/finance/***

  * **Actions** :

    * [x] Quand l’agent génère une **stratégie** ou une **analyse**, créer un **artefact** de type “chart” :

      * symbol + timeframe,
      * indicateurs (`sma/ema/rsi/macd/bollinger` via `lib/finance/indicators.ts`),
      * annotations (zones, flèches, lignes) via l’`AttentionLayer`.
    * [x] Dans l’artefact, capter `click` sur le canvas et émettre un **événement** (voir `lib/ui/events.ts`) qui
      rattache le prochain message utilisateur à la **bougie**/point cliqué (ancre).
    * [x] Bouton “Ouvrir dans le chat” qui préremplit l’input avec une mention ancrée (cf. tests `artifact-interact.spec.ts`).
  * **Objectif** : fluide : artefact ↔ chat, et inversement.

* [x] **lib/ai/tools-finance.ts** — Vérifier les outils d’agent

  * **Action** : s’assurer que `show_chart`, `add_indicator`, `annotate`, `fetch_ohlc` sont exposés et utilisés dans les prompts “finance”.
  * **Piège** : valider les schémas Zod pour éviter les 400/422 silencieux.

* [x] **components/bento/ChartGrid.tsx** — Émettre `ask_about_selection` lors du clic sur une bougie pour ancrer la prochaine question du chat à l’horodatage choisi.

---

# i18n : clés et fallback

* [x] **messages/fr/dashboard.json** & **messages/en/dashboard.json**

  * **État** : `dashboard.prices` est présent dans la version courante (l’ancienne erreur `MISSING_MESSAGE` était due à une version précédente).
  * **Actions** :

    * [x] Vérifier la présence des labels utilisés par les tiles (ex : “Summarise”, “Split view”, tooltips toolbar…).
    * [x] Si ajout de labels dans `ChartToolbar`/`MenuTile`, mettre à jour les 2 fichiers.
  * **Objectif** : garder `tests/i18n/key-check.test.ts` au vert.

---

# API finance : robustesse & cache

* [x] **app/(chat)/api/finance/quote/route.ts** & **.../ohlc/route.ts**

  * **État** : unit/integration tests OK (retries, TTL intraday/daily).
  * **Actions** :

    * [x] S’assurer que le **bento** utilise la route `/api/finance/ohlc` et respecte les TTL pour éviter le spam réseau.
    * [x] Pour la tuile “Cours”, **debouncer** les changements de timeframe/split pour minimiser les fetchs.
  * **Objectif** : fluidité perçue + sobriété réseau.

---

# Tests E2E : remettre au vert

* [x] **tests/pages/chat.ts** — Les sélecteurs supposent l’input sur `/`

  * **Action** : avec le **dock** ajouté à la Home et `data-testid="multimodal-input"`, les timeouts devraient disparaître.
  * **Objectif** : déverrouiller tous les scénarios `chat.*`.

* [x] **tests/e2e/dashboard.spec.ts** — Toggler du menu

  * **Action** : vérifier la présence du `data-testid="tile-menu-toggle"` dans `MenuTile` (il y est), et que l’overlay toolbar ne se rend plus globalement (comme attendu par le test).
  * **Objectif** : assertion de visibilité redevient vraie quand la Home ne 500 plus.

* [x] **tests/e2e/artifacts.test.ts** & **artifact-interact.spec.ts**

  * **Action** : s’assurer que l’**analyses-card** apparaît (voir plus haut) et que cliquer “Sample analysis” ouvre bien un artefact avec `data-testid="artifact-view"` et un `canvas` cliquable.
  * **Objectif** : pouvoir cliquer une bougie et voir le chat s’ancrer.
  * **Progress** : nettoyé la création de chat en double dans `artifacts.test.ts` pour clarifier les scénarios.

* [x] Investigate Playwright test suite hanging after build; ensure tests execute without manual interruption.
  * **Progress** : pretest now installs Chromium with system dependencies via `playwright install --with-deps`, allowing the suite to run without manual intervention.

---

# Accessibilité & testability

* [x] Ajouter/valider les `data-testid` suivants :

* [x] Home : `bento-grid`, `tile-menu-toggle`, `multimodal-input`
* [x] Chart : `chart-grid`, `chart-canvas`, `tf-{value}`, `series-{type}`, `ind-{name}`
* [x] News : `news-card`, `news-item`, `news-summarise`
* [x] Analyses : `analyses-card`, `analysis-item`
* [x] Artefact : `artifact-view`

---

# Petites arêtes vives / perf

* [x] **components/finance/ChartPanel.tsx**

  * **Action** : s’assurer que la **désinscription** des listeners `ResizeObserver`, `onVisibleRangeChanged`, etc., est bien effectuée dans le `useEffect` cleanup.
  * **Objectif** : éviter les fuites mémoires et listeners “fantômes”.

* [x] **components/finance/ChartToolbar.tsx**

  * **Action** : `onToggleIndicator` doit garder une liste **unique** (Set) pour éviter les doublons lors de toggles rapides.
  * **Snippet** :

    ```tsx
    setIndicators(prev => prev.includes(name) ? prev.filter(n => n!==name) : [...prev, name]);
    // ou
    setIndicators(prev => {
      const s = new Set(prev);
      s.has(name) ? s.delete(name) : s.add(name);
      return [...s];
    });
    ```

---

# Sécurité & CI

* [x] **scripts/scan-secrets.ts** — déjà OK (tests verts), garder l’exécution en pré-unit.
* [x] Ajouter une étape **lancée en CI** pour empêcher la régression PPR :

  * **Action** : vérif simple dans un script que **aucun** `experimental_ppr = true` n’est committé dans un segment tant que la suite E2E n’est pas PPR-safe.
  * **Snippet** :

    ```bash
    git grep -n "export const experimental_ppr = true" && \
      echo "PPR segment ON interdit en CI" && exit 1 || exit 0
    ```

---

# Résumé des “gros rochers”

1. **Fix critique** : retirer `export const experimental_ppr = true` dans `app/(chat)/layout.tsx` **et** builder l’app **avec `PLAYWRIGHT=True`** avant les E2E.
2. **Home** : ajouter le **chat dock** fixe bas-centre, déclencher le **fade-out** et **rediriger** vers `/chat/:id` à l’envoi.
3. **Bento synchronisé** : `symbol/timeframe` partagés entre Cours, News, Analyses/Stratégies, avec split 1/2/4 et toolbar compacte.
4. **Artefacts** : interaction bougie→chat ancré, indicateurs & annotations, consultation depuis la tuile analyses.
5. **i18n** & **tests** : maintenir les clés, fournir les `data-testid` attendus, et remettre le vert E2E.

Ensuite, on pourra passer au “sucré-salé” : backtests pilotés par agent, paramétriques, et génération d’artefacts comparatifs multi-stratégies.

---

## Historique

* 2024-11-09: reset du fichier AGENTS.md et import de la nouvelle TODO.
* 2024-11-09: neutralisation PPR dans app/(chat)/layout.tsx, build Playwright dans playwright.config.ts, scripts CI et garde-fou next.config.ts.
* 2025-08-18: ajout des attributs `data-testid` pour le chat dock et stabilisation de la grille bento avec la classe `bento-grid`.
* 2025-08-19: nettoyage des listeners dans `ChartPanel` et gestion unique des indicateurs dans `ChartToolbar`.
* 2025-08-20: localisation des labels de la toolbar du graphique et ajout des testids `chart-grid`/`chart-canvas`.
* 2025-08-20: ajout des testids pour les tuiles News et Analyses avec couverture de tests associée.
* 2025-08-22: couverture du refetch de NewsCard et validation du state asset/timeframe partagé.
* 2025-08-23: conversion du chat dock en overlay fixe et ajout de la transition de fade-out sur la grille bento.
* 2025-08-24: home rendue dans `SidebarInset` avec `SidebarProvider` et utilisation de `SidebarToggle` partagé.
* 2025-08-26: ajout des outils `add_indicator`, `annotate` et alias `fetch_ohlc` avec tests unitaires et événement UI dédié.
* 2025-08-27: nettoyage des scénarios de test e2e d'artefacts pour éviter les créations de chat redondantes.
* 2025-08-28: prise en charge des overlays d’indicateurs dans les artefacts de graphique avec test unitaire.
* 2025-08-29: intégration du MenuTile dans la grille bento et validation des scénarios E2E tableau de bord et artefacts.
* 2025-08-30: remplacement du champ texte du ChatDock par `MultimodalInput` pour supporter les pièces jointes et la redirection vers le chat.
* 2025-08-31: stabilisation du test `useDebounce` en restaurant les globals et ajout d'une tâche pour investiguer le blocage de la suite E2E.
* 2025-09-01: simplification du pretest e2e pour n'installer que Chromium; les tests échouent faute de dépendances système.
* 2025-09-02: préinstallation des dépendances système Playwright via `playwright install --with-deps` pour débloquer la suite E2E.
* 2025-09-03: émission d'événements `ask_about_selection` au clic sur les bougies du graphique pour ancrer le chat.
* 2025-09-04: désactivation de `reuseExistingServer` dans `playwright.config.ts` pour forcer un nouveau build Playwright.
* 2025-09-05: Playwright démarre désormais sur la build préalablement générée; `pretest:e2e` installe Chromium et construit l'app.
