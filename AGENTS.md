Parfait. Voici une **checklist exhaustive, hiérarchisée et “file-by-file”** pour qu’un agent IA puisse **corriger/ajouter/supprimer/modifier** ce qu’il reste, en s’appuyant sur :

* la **version actuelle du code**, 
* l’**analyse des échecs Playwright** (erreur `clientModules`, timeouts sur `multimodal-input`, etc.), 
* la **direction globale** (stabiliser le rendu App Router, conserver les tests e2e réalistes, limiter les features expérimentales, garder les fallback finance et l’i18n stables).

J’inclus des **snippets** là où il y a de la subtilité ou des pièges.

---

# ✅ Checklist détaillée (par fichier)

## 1) `package.json`

* [x] **Fixer la version de Next.js sur une stable** (éviter le canary qui casse le SSR/RSC avec `clientModules`).

  * [x] Remplacer `next: 15.3.0-canary.31` par une **stable récente** (ex. `15.2.1`).
  * [x] Forcer via `overrides` (Yarn/Pnpm résolvent parfois des sous-dépendances canary).
  * [x] Supprimer le “double build” pendant la CI (on laisse Playwright builder/démarrer le server via `webServer.command`).
  * [x] **Garder `OTEL_SDK_DISABLED=1`** dans `test:e2e` pour réduire le bruit réseau et stabiliser les temps.

  * **Snippet** :

    ```json
    {
      "dependencies": {
        "next": "15.2.1",
        "react": "18.3.1",
        "react-dom": "18.3.1"
      },
      "overrides": {
        "next": "15.2.1"
      },
      "scripts": {
        "pretest:e2e": "pnpm exec playwright install --with-deps chromium && rm -rf .next",
        "test:e2e": "tsx scripts/ci/ensure-no-only-fixme.ts && tsx scripts/ci/count-tests.ts && OTEL_SDK_DISABLED=1 PLAYWRIGHT=True pnpm exec playwright test"
      }
    }
    ```
* [x] **Supprimer le “double build”** pendant la CI (on laisse Playwright builder/démarrer le server via `webServer.command`).
* [x] **Garder `OTEL_SDK_DISABLED=1`** dans `test:e2e` pour réduire le bruit réseau et stabiliser les temps.

**Objectif attendu** : Plus d’erreur `Cannot read properties of undefined (reading 'clientModules')` au SSR ; temps e2e plus stable.

---

## 2) `next.config.ts`

* [x] **Désactiver explicitement PPR et autres flags expérimentaux** (source majeure d’instabilité en canary).
* [x] **Ne pas utiliser `output: 'standalone'`** pendant la CI e2e (ça brouille les chemins du manifeste RSC).
* **Snippet** :

  ```ts
  // next.config.ts
  const nextConfig = {
    experimental: {
      ppr: false,           // important
      reactCompiler: false, // si jamais activé
      serverSourceMaps: false,
    },
    // output: undefined,   // éviter 'standalone' pour e2e/CI
  };

  module.exports = nextConfig;
  ```

**Objectif attendu** : Rendu App Router prévisible en CI, plus de plantage manifeste RSC.

---

## 3) `playwright.config.ts`

* [x] **Centraliser build + start** dans `webServer` (supprimer build ailleurs).
* [x] **Ajouter un timeout suffisant** (180s mini) pour le cold build.
* [x] **Activer `reuseExistingServer` en local** (plus rapide).
* **Snippet** :

  ```ts
  import { defineConfig, devices } from '@playwright/test';

  export default defineConfig({
    webServer: {
      command: 'rm -rf .next && PLAYWRIGHT=True pnpm build && PLAYWRIGHT=True pnpm start -p 3110',
      port: 3110,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    use: {
      baseURL: 'http://localhost:3110',
      trace: 'on-first-retry',
      video: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  });
  ```

**Objectif attendu** : Un seul chemin d’exécution build→start pour e2e, moins d’états incohérents.

---

## 4) `scripts/ci/ensure-no-ppr.sh` (ou créer ce fichier)

* [x] **Corriger l’usage de `git grep`** (ordre des args & exclusions).
* [x] **Échouer le job si `experimental_ppr = true` ou `ppr: true` hors `next.config.ts`.**
* **Snippet** :

  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  echo "[guard] Scanning for PPR flags…"

  if git grep -n -e 'export const[[:space:]]\+experimental_ppr[[:space:]]*=[[:space:]]*true' -- . ":(exclude)**/*.md" ; then
    echo "❌ Found 'export const experimental_ppr = true'"
    exit 1
  fi

  if git grep -n -e 'ppr:[[:space:]]*true' -- . ":(exclude)**/*.md" ":(exclude)next.config.ts" ; then
    echo "❌ Found 'ppr: true' outside next.config.ts"
    exit 1
  fi

  echo "✅ No PPR flags found."
  ```

**Objectif attendu** : Empêcher toute réactivation accidentelle de PPR qui réintroduirait les 500 SSR.

---

## 5) `components/artifact/ArtifactViewer.tsx`

* [x] **Exposer un `data-testid="artifact-view"`** sur le conteneur du canvas (les tests e2e l’attendent).
* [x] **S’assurer que le canvas est monté avant l’interaction** (utiliser `useEffect`/`requestAnimationFrame` si besoin).
* **Snippet** :

  ```tsx
  // components/artifact/ArtifactViewer.tsx
  'use client';
  import { useEffect, useRef } from 'react';

  export function ArtifactViewer(/* props */) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      // monter le canvas dans containerRef.current
      // requestAnimationFrame(() => initChart(containerRef.current!))
    }, []);

    return (
      <div className="relative w-full">
        {/* … toolbar, etc. */}
        <div
          ref={containerRef}
          className="h-64"
          data-testid="artifact-view"  // ← requis par les tests
        />
      </div>
    );
  }
  ```

**Objectif attendu** : Les tests **artifact-interact** ne cassent plus sur un sélecteur inexistant.

---

## 6) `components/chat/MultimodalInput.tsx` (ou équivalent)

* [x] **Vérifier/ajouter `data-testid="multimodal-input"`** sur la racine du champ d’entrée utilisé par la home/chat.
* **Snippet (exemple générique)** :

  ```tsx
  // components/chat/MultimodalInput.tsx
  'use client';
  import { useState } from 'react';

  export function MultimodalInput(/* props */) {
    const [value, setValue] = useState('');

    return (
      <form data-testid="multimodal-input" onSubmit={/* … */}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask anything…"
        />
        {/* boutons, upload, etc. */}
      </form>
    );
  }
  ```

**Objectif attendu** : Tous les tests e2e qui attendent la visibilité de `multimodal-input` peuvent progresser.

---

## 7) `app/page.tsx` (ou `app/(home)/page.tsx`)

* [x] **Garantir la présence de `data-testid="bento-grid"`** sur la grille d’accueil.
* [ ] **Limiter l’hydratation à ce qui est nécessaire** (éviter d’inclure des comps client non indispensables au fold).
* **Snippet** :

  ```tsx
  // app/page.tsx
  import { Suspense } from 'react';
  import { BentoGrid } from '@/components/bento/BentoGrid';

  export default function Home() {
    return (
      <main>
        <Suspense fallback={null}>
          <BentoGrid data-testid="bento-grid" />
        </Suspense>
      </main>
    );
  }
  ```

**Objectif attendu** : Les assertions e2e (`bento-grid`) passent ; SSR/hydratation restent stables.

---

## 8) `tests/pages/chat.ts`

* [x] **Ne pas “masquer” un vrai problème d’app** : conserver l’attente stricte de `multimodal-input`.
* [ ] **Optionnel** : ajouter un `page.waitForURL('**/', { waitUntil: 'domcontentloaded' })` juste après `goto('/')` pour fiabiliser les temps d’attente, **sans** relâcher la contrainte de présence du testid.
* **Snippet (ajout minimal)** :

  ```ts
  await page.goto('/');
  await page.waitForURL('**/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('multimodal-input').waitFor({ state: 'visible' });
  ```

**Objectif attendu** : Tests robustes mais toujours révélateurs si la page 500.

---

## 9) `app/ping/route.ts` (déjà présent)

* [ ] **Vérifier qu’il renvoie `200` sans dépendances DB** (utile pour healthcheck local).
* **Snippet** :

  ```ts
  // app/ping/route.ts
  export async function GET() {
    return new Response('pong', { status: 200 });
  }
  ```

**Objectif attendu** : Health rapide; si vous voulez l’utiliser, vous pouvez pointer Playwright dessus pour un check initial (facultatif, Playwright attend déjà la page).

---

## 10) `lib/db/migrate.ts`

* [ ] **Garder le comportement “skip migrations sans POSTGRES_URL”** mais :

  * [ ] **Éviter tout import/side-effect coûteux** côté app quand on n’a pas Postgres.
  * [ ] **S’assurer que SQLite de test (si utilisée dans le runtime Playwright)** n’introduit pas d’avertissements bloquants (l’avertissement *experimental SQLite* n’est pas bloquant, on peut l’ignorer).
* **Snippet (pattern)** :

  ```ts
  // lib/db/migrate.ts
  if (!process.env.POSTGRES_URL) {
    console.log('POSTGRES_URL is not defined; skipping migrations');
    process.exit(0);
  }
  // … migrations réelles Postgres …
  ```

**Objectif attendu** : Build CI propre, aucun crash au `require`/`import` du module en l’absence d’URL Postgres.

---

## 11) `app/api/chat/route.ts` et `app/api/chat/[id]/stream/route.ts`

* [ ] **Confirmer `export const runtime = 'nodejs'`** si vous utilisez des libs Node (stream, fs, etc.).
* [ ] **S’assurer que la route GET de stream répond toujours, même si le provider IA est mocké en CI**.
* **Snippet** :

  ```ts
  export const runtime = 'nodejs';

  export async function POST(req: Request) {
    // validation, création du message, renvoi de l’id
  }
  ```

**Objectif attendu** : Les e2e de chat (redirect `/chat/:id`, upvote/downvote, stop generation) ont un backend stable (mock si nécessaire).

---

## 12) `app/api/finance/*/route.ts` (quote, ohlc, news, etc.)

* [ ] **Confirmer l’ordre de fallback** (Yahoo → Stooq / Binance) et les TTL (intraday vs daily) — vos tests unitaires passent, donc **ne rien casser**.
* [ ] **Ajouter des logs de niveau “debug” sous flag** (`DEBUG_FINANCE=1`) si on doit diagnostiquer en CI.
* **Snippet (pattern)** :

  ```ts
  const debug = process.env.DEBUG_FINANCE === '1';
  if (debug) console.log('[finance] fetching ohlc', { symbol, interval });
  ```

**Objectif attendu** : Zéro régression sur la stack finance déjà verte en unit tests ; observabilité togglable.

---

## 13) `components/bento/*` (NewsCard, AnalysesCard, etc.)

* [ ] **Garder les `data-testid` déjà employés par les tests** (`bento-grid` vu côté page ; NewsCard/AnalysesCard ont leurs tests unitaires verts).
* [ ] **S’assurer que le 1er rendu ne déclenche pas de fetch bloquant SSR** (utiliser `useEffect`/SWR côté client si nécessaire).

**Objectif attendu** : L’accueil se rend vite ; Playwright n’attend pas un SSR lourd.

---

## 14) `middleware.ts` (si présent)

* [ ] **Éviter toute manipulation non essentielle** de requêtes qui pourrait casser le manifeste RSC (en canary, mais par sécurité même en stable).
* [ ] **Limiter le scope `matcher`** aux chemins strictement nécessaires.

**Objectif attendu** : Moins de risque d’interférer avec le rendu `_app`/RSC.

---

## 15) `scripts/ci/count-tests.ts` & `scripts/ci/ensure-no-only-fixme.ts`

* [ ] **Conserver tels quels** (ces scripts sont utiles et passaient).
* [ ] **Ajouter une sortie claire** quand des tests e2e sont ignorés/skippés.

**Objectif attendu** : Visibilité CI accrue sans impacter les temps.

---

## 16) `tests/e2e/*.spec.ts` (général)

* [ ] **Ne pas affaiblir les assertions** (les timeouts venaient du 500 SSR).
* [ ] **Conserver les `getByTestId('multimodal-input')`** (utile sentinelle de rendu).
* [ ] **(Si flakiness résiduelle)** Ajouter `test.slow()` ou un `expect.poll` *ciblé*, mais seulement si nécessaire.
* **Snippet (poll ciblé)** :

  ```ts
  await expect
    .poll(async () => (await page.getByTestId('multimodal-input').count()) > 0)
    .toBeTruthy({ timeout: 10_000 });
  ```

**Objectif attendu** : e2e stables, représentatifs de l’expérience utilisateur réelle.

---

## 17) `components/common/ErrorBoundary.tsx` (ou à créer si absent)

* [ ] **Ajouter un ErrorBoundary côté client** autour des zones interactives (chat, artifact).
* [ ] **Affichage d’un message utilisateur simple et d’un `data-testid="ui-error"`** pour des assertions e2e ciblées si nécessaire.
* **Snippet** :

  ```tsx
  'use client';
  import React from 'react';

  export class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
  > {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(err: unknown) { console.error(err); }
    render() {
      if (this.state.hasError) {
        return <div data-testid="ui-error">Something went wrong.</div>;
      }
      return this.props.children;
    }
  }
  ```

**Objectif attendu** : Dégradation gracieuse au lieu d’un écran vide si un client component casse.

---

## 18) `lib/utils/getBaseUrl.ts` (ou équivalent ; vous avez des tests)

* [ ] **Ne rien changer** si tous les tests sont verts (headers → fallback → VERCEL_URL).
* [ ] **Ajouter un log conditionnel** si DEBUG on.

**Objectif attendu** : Préserver le passage des tests `base URL` + diagnostic aisé si souci de proxy.

---

## 19) i18n (`lib/i18n/*`, `locales/*`)

* [ ] **Garder la parité des clés** (tests verts).
* [ ] **S’assurer que les disclaimers FR/EN pour finance restent présents** (tests verts).
* [ ] **Optionnel** : exposer un script `pnpm i18n:check` pour dev.

**Objectif attendu** : Zéro régression i18n.

---

## 20) `app/api/files/upload/route.ts` (ou équivalent)

* [ ] **Garantir un mock/implémentation safe** en CI (pas d’appel S3/GCS réels).
* [ ] **Limiter la taille en CI** via env (sinon flakiness si grosses images).

**Objectif attendu** : Le test “Upload file and send image attachment” ne dépend pas d’un service externe.

---

## 21) `components/chat/SuggestedActions.tsx` (ou équivalent)

* [ ] **Vérifier l’état caché/visible** après envoi de message (les e2e le couvrent).
* [ ] **Pas de fetch SSR bloquant**.

**Objectif attendu** : Passage de “Hide suggested actions after sending message”.

---

## 22) `app/api/vote/route.ts`

* [ ] **Upvote/Downvote/Update vote** → mock data store en CI si Postgres absent.
* [ ] **Runtime Node** si utilisation de libs Node.

**Objectif attendu** : Les scénarios vote e2e passent sans DB distante.

---

## 23) `components/chat/ScrollToBottom.tsx` (ou comportement équivalent)

* [x] **S’assurer que le bouton n’apparaît qu’après dépassement d’un seuil** (utiliser `IntersectionObserver` si présent).
* [x] **Ajouter `data-testid="scroll-bottom-button"`** si testé.
* **Snippet (pattern)** :

  ```tsx
  'use client';
  import { useEffect, useState } from 'react';

  export function ScrollToBottomButton({ viewportRef }: { viewportRef: React.RefObject<HTMLElement> }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
      const el = viewportRef.current;
      if (!el) return;
      const onScroll = () => setVisible(el.scrollTop < el.scrollHeight - el.clientHeight - 80);
      el.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      return () => el.removeEventListener('scroll', onScroll);
    }, [viewportRef]);
    if (!visible) return null;
    return (
      <button
        data-testid="scroll-bottom-button"
        onClick={() => viewportRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' })}
      >
        Scroll to bottom
      </button>
    );
  }
  ```

**Objectif attendu** : Tests “scroll button appears/hides” passent.

---

## 24) `lib/telemetry/*` (si présent)

* [x] **Ne pas envoyer de télémétrie en e2e** (`OTEL_SDK_DISABLED=1` déjà positionné).
* [x] **Ajouter un guard** pour ne rien initialiser si env absent.

**Objectif attendu** : e2e isolés, pas de timeouts réseau.

---

## 25) Accessibilité & testability transverses

* [x] **Chaque composant interactif clé a un `data-testid` stable** :

  * `multimodal-input`, `bento-grid`, `artifact-view`, `scroll-bottom-button`, etc.
* [x] **Pas de `role`/`aria` contradictoires** (évite sélecteurs flous plus tard).

**Objectif attendu** : Sélecteurs robustes, lisibilité e2e.

---

# ⚠️ Tâches “Attention particulière” (risques/complexité)

## A) Mélange RSC / Client Components

* [x] **Vérifier que tout composant utilisant état/effets est `use client`**.
* [x] **Éviter d’importer un client component depuis un server component sans `dynamic(..., { ssr: false })` si nécessaire.**
* **Snippet (si composant client lourd dans page serveur)** :

  ```tsx
  import dynamic from 'next/dynamic';
  const ClientOnlyWidget = dynamic(() => import('@/components/ClientWidget'), { ssr: false });

  export default function Page() {
    return <ClientOnlyWidget />;
  }
  ```

**But** : Éviter des crashs RSC subtils qui pourraient resurgir.

---

## B) Runtime des routes

* [x] **Assigner `runtime = 'nodejs'`** pour toutes les routes qui utilisent des libs Node (streams, crypto non Web, etc.).
* **Snippet** :

  ```ts
  export const runtime = 'nodejs';
  ```

**But** : Empêcher l’exécution Edge involontaire (erreurs silencieuses parfois).

---

## C) Caches & TTL (finance)

* [x] **Conserver les TTL exacts testés** (intraday vs daily).
* [x] **Ne pas dériver la stratégie de cache pendant e2e** (risque d’usure réseau).

**But** : Maintenir les unit tests en vert et les e2e rapides.

---

# 🧪 Plan de validation final

* [ ] `pnpm i && pnpm build` → **Next 15.2.x** affiché ; plus de 500 au SSR.
* [ ] `pnpm start -p 3110` → **GET `/` = 200** (console sans `clientModules`).
* [ ] `pnpm test:unit` → **vert** (déjà OK).
* [ ] `pnpm test:e2e` → plus de timeouts `multimodal-input` ; les scénarios artifacts/chat/dashboard passent.
* [ ] Re-lancer CI → tous les jobs verts (unit + e2e).

---

## Récap express des 4 correctifs “must-have”

1. **Pin Next** sur **15.2.1** (package.json).
2. **Désactiver PPR** & flags instables (next.config.ts).
3. **Unifier build/start** dans `playwright.config.ts` (pas de double build).
4. **Ajouter les testids manquants** (`artifact-view`, vérifier `multimodal-input`, `bento-grid`).

Avec ça, on élimine la racine des 500 SSR et on déverrouille la batterie e2e.

---

## Historique

- 2024-11-07 : Pinned Next.js to 15.2.1, disabled PPR, unified Playwright build/start, added `artifact-view` and `multimodal-input` test hooks.
- 2024-11-07 : Documented scroll-to-bottom threshold and marked telemetry/testid tasks as complete.
- 2024-11-07 : Added missing `use client` directives and verified API routes run on the Node.js runtime.
- 2025-08-20 : Converted the home page to a client component to avoid server-side imports and reinstalled Next 15.2.1; build succeeds but `/` still returns 404.
