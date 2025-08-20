Parfait — je reprends **l’état actuel du repo** (tel qu’inspecté), **le log CI** que tu viens de coller, et **nos deux derniers comptes-rendus** (audit + direction de correction) pour te livrer une **liste exhaustive de tâches à cocher**, orientée *agent IA*, **fichier par fichier**, avec sous-étapes, objectifs attendus, et snippets là où il y a des pièges.

---

# Bloc 0 — Hotfix PPR (bloquant E2E)

## `app/(chat)/layout.tsx`

* [x] **Supprimer tout export segmentaire PPR**.

  * **Problème** : même `export const experimental_ppr = false` peut faire basculer le segment dans un codepath PPR sur Next 15 canary → `clientModules` undefined en E2E.
  * **Action** : *retirer* totalement la ligne.
  * **Objectif** : éviter toute activation segmentaire du pipeline PPR pendant les E2E.

  **Snippet**

  ```diff
  - export const experimental_ppr = false;
  ```

## `next.config.ts`

* [x] **Durcir la désactivation PPR en E2E/CI**.

  * **Problème** : comparaison d’ENV fragile, et CI non pris en compte.
  * **Actions** :

    * normaliser `PLAYWRIGHT` en lower-case,
    * considérer `CI` comme désactivateur de PPR,
    * documenter clairement le piège.
  * **Objectif** : PPR **OFF** dès que `PLAYWRIGHT=True` **ou** en CI.

  **Snippet**

  ```diff
  - const isPlaywright = process.env.PLAYWRIGHT === 'True';
  + const isPlaywright = String(process.env.PLAYWRIGHT || '').toLowerCase() === 'true';
  + const isCI = !!process.env.CI;

  export default defineNextConfig({
    experimental: {
  -   ppr: !isPlaywright,
  +   // PPR off pour E2E/CI (évite clientModules undefined sur Next 15 canary)
  +   ppr: !(isPlaywright || isCI),
      // ...
    },
  });
  ```

## `playwright.config.ts`

* [x] **Forcer un build “Playwright” juste avant le start** (ceinture+bretelles).

  * **Problème** : bien que le `pretest:e2e` fasse un build Playwright, le `webServer.command` peut redémarrer sur un build précédent si la CI évolue.
  * **Action** : chaîner `rm -rf .next && PLAYWRIGHT=True pnpm build && PLAYWRIGHT=True pnpm start -p 3110`.
  * **Objectif** : certitude que le serveur E2E tourne avec PPR OFF.

  **Snippet**

  ```diff
  webServer: {
  -  command: 'pnpm start -p 3110',
  +  command: 'rm -rf .next && PLAYWRIGHT=True pnpm build && PLAYWRIGHT=True pnpm start -p 3110',
     port: 3110,
     reuseExistingServer: false,
     env: { PLAYWRIGHT: 'True', OTEL_SDK_DISABLED: '1' },
     timeout: 120_000,
  },
  ```

## `.github/workflows/playwright.yml` + `scripts/ci/ensure-no-ppr.sh`

* [x] **Brancher la barrière anti-PPR en CI**.

  * **Action** : appeler le script existant **après** l’install et **avant** les tests.
  * **Objectif** : empêcher toute régression segmentaire PPR.
* [x] **Exclure la doc** du grep (sinon les exemples dans `*.md` feront échouer la CI).

  * **Action** : ajuster le script pour ignorer `**/*.md`.

  **Snippets**

  ```diff
  # .github/workflows/playwright.yml
  - name: Install dependencies
    run: pnpm install --frozen-lockfile

  +- name: Guard against segment PPR
  +  run: pnpm ci:check-ppr
  ```

  ```diff
  # scripts/ci/ensure-no-ppr.sh
  - git grep -n "export const experimental_ppr = true" && \
  + git grep -n -- ":!**/*.md" "export const experimental_ppr = true" && \
    echo "PPR segment ON interdit en CI" et exit 1 || exit 0
  ```

---

# Bloc 1 — E2E robustes (ports, smoke et sélecteurs)

## `tests/pages/chat.ts`

* [x] **Rendre les assertions d’URL agnostiques du port**.

  * **Problème** : des tests antérieurs utilisaient `http://localhost:3000/...`. Le `baseURL` Playwright est **3110**.
  * **Action** : matcher **uniquement** sur le **pathname**.
  * **Objectif** : pas de flakiness si le port change.

  **Snippet**

  ```diff
  - await expect(this.page).toHaveURL(/^http:\/\/localhost:3000\/chat\/[0-9a-f-]{36}$/);
  + await expect(this.page).toHaveURL(/\/chat\/[0-9a-f-]{36}$/);
  ```

* [x] **Stabiliser l’attente de l’input** (plus robuste que “click immédiat”).

  * **Action** : attendre l’apparition puis interagir.
  * **Objectif** : éviter le timeout si `/` a un petit délai de montage.

  **Snippet**

  ```diff
  async sendUserMessage(message: string) {
  -  await this.multimodalInput.click();
  +  await this.page.getByTestId('multimodal-input').waitFor({ state: 'visible' });
  +  await this.multimodalInput.click();
     await this.multimodalInput.fill(message);
     await this.sendButton.click();
  }
  ```

## `tests/e2e/**`

* [x] **Remplacer les `page.goto('http://localhost:3000/...')`** (s’il en reste) par des **chemins relatifs**.

  * **Action** : `await page.goto('/')` partout.
  * **Objectif** : ne plus dépendre du port.

* [x] **Éliminer les URL avec port dans les cookies de tests**.

  * **Action** : utiliser `{ domain: 'localhost', path: '/' }` au lieu d'un `url` avec port.
  * **Objectif** : garder les suites E2E portables quel que soit le `baseURL`.

* [x] **Conserver le smoke test Home** (existant indirectement) : après hotfix PPR, vérifier `data-testid="bento-grid"` + `multimodal-input` visibles avant d’enchaîner.

---

# Bloc 2 — Nettoyage & perf chart (fuites listeners)

## `components/finance/ChartPanel.tsx`

* [x] **Ajouter des cleanups dans chaque `useEffect` installateur**.

  * **Problème** : `ResizeObserver`, `window.addEventListener`, `chart` subscriptions, bus d’événements → **pas** désinscrits.
  * **Objectif** : zéro fuite mémoire, pas de handlers fantômes à la navigation, stabilité des E2E “long run”.

  **Snippet (patron)**

  ```tsx
  import { useEffect, useRef } from 'react';
  // ...

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    // création du chart
    const chart = createChart(el, {/* options */});
    const onCrosshair = (param: CrosshairMoveEvent) => { /* ... */ };
    chart.subscribeCrosshairMove(onCrosshair);

    // resize observer
    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);

    // window resize fallback
    const onResize = () => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight });
    };
    window.addEventListener('resize', onResize);

    // bus d’événements (si utilisé)
    const unsubBus = uiEvents.subscribe('onVisibleRangeChanged', /* ... */);

    return () => {
      try { chart.unsubscribeCrosshairMove(onCrosshair); } catch {}
      try { chart.remove(); } catch {}
      try { ro.disconnect(); } catch {}
      window.removeEventListener('resize', onResize);
      try { unsubBus?.(); } catch {}
    };
  }, [/* deps réelles: symbol, timeframe, split, etc. */]);
  ```

* [x] **Vérifier que le `canvas` a bien `data-testid="chart-canvas"`** (il existe déjà côté panel ou wrapper).

  * **Objectif** : testabilité stable.

* [x] **Couverture unitaire des cleanups**.

  * **Problème** : sans test, les régressions de nettoyage pourraient passer inaperçues.
  * **Action** : tester que `ResizeObserver`, l'écouteur `resize`, la souscription crosshair et la destruction du chart sont bien libérés à l'unmount.
  * **Objectif** : prévenir les fuites à l'avenir.

---

# Bloc 3 — ESLint & hygiène d’imports

## `components/bento/ChartGrid.tsx`

* [x] **Corriger l’import de `useDebounce` (warning import/no-named-as-default)**.

  * **Action** : importer en **named import** si le module exporte nommé.
  * **Objectif** : build propre.

  **Snippet**

  ```diff
  - import useDebounce from '@/hooks/use-debounce';
  + import { useDebounce } from '@/hooks/use-debounce';
  ```

## `components/dashboard/tiles/CurrentPricesTile.tsx`

* [x] **Renommer l’identifiant local du default import `clsx`** pour calmer `import/no-named-as-default`.

  * **Action** : `import cx from 'clsx'` puis remplacer usages.
  * **Objectif** : warnings à zéro.

  **Snippet**

  ```diff
  - import clsx from 'clsx';
  + import cx from 'clsx';
  // ...
  - <div className={clsx('...', condition && '...')} />
  + <div className={cx('...', condition && '...')} />
  ```

## `components/finance/ChartToolbar.tsx`

* [x] **Passer aux named imports React** (évite les warnings `import/no-named-as-default-member`).

  * **Action** : `import { useEffect, useState } from 'react'`; retirer `React.useX`.
  * **Objectif** : code plus clair, linter clean.

  **Snippet**

  ```diff
  - import React from 'react';
  + import { useEffect, useState } from 'react';

  - const [state, setState] = React.useState(/*...*/);
  + const [state, setState] = useState(/*...*/);

  - React.useEffect(() => { /* ... */ }, [/* ... */]);
  + useEffect(() => { /* ... */ }, [/* ... */]);
  ```

---

# Bloc 4 — Tests (stabilité, coverage, non-régressions)

## `tests/bento/analyses-card.test.tsx`

* [x] **Retirer le `SKIP`** dès que la Home `/` remonte sans 500.

  * **Action** : si besoin, mounter la version client via `next/dynamic` mock (`ssr: false`) dans JSDOM.
  * **Objectif** : couvrir la tuile analyses (présence, items filtrés, bouton “Sample analysis”).

  **Snippet indicatif (mock dynamic)**

  ```ts
  jest.mock('next/dynamic', () => (factory: any) => {
    const C = factory();
    return C;
  });
  // ou monter directement AnalysesCardClient dans le test.
  ```

## `tests/e2e/**`

* [x] **Ajouter un “preflight” attendu commun** avant chaque scénario chat:

  * **Action** : attendre `getByTestId('multimodal-input')` visible **sur `/`**, puis poursuivre.
  * **Objectif** : éviter d’échouer sur des attentes aval si la Home a un petit délai.

  **Snippet**

  ```ts
  await page.goto('/');
  await page.getByTestId('multimodal-input').waitFor({ state: 'visible' });
  ```

* [x] **Uniformiser les assertions d’URL** sur le **pathname** (cf. plus haut).

---

# Bloc 5 — API/UX finance (cohérence & sobriété réseau)

## `components/bento/ChartGrid.tsx`

* [x] **Confirmer l’utilisation de `/api/finance/ohlc`** (OK) et le **debounce** des changements timeframe/split (OK).
* [x] **Limiter les re-fetchs simultanés** (si multi-split 2/4) :

  * **Action** : mutualiser les `fetch` par (symbol, timeframe) via un mini cache local (Map) côté composant, TTL court (ex. 250–500 ms).
  * **Objectif** : sobriété réseau + fluidité perceptible.

  **Sketch**

  ```ts
  const cache = useRef(new Map<string, Promise<Data>>());
  const key = `${symbol}:${timeframe}`;
  if (!cache.current.has(key)) {
    cache.current.set(key, fetch(`/api/finance/ohlc?...`).then(r => r.json()));
  }
  const data = await cache.current.get(key);
  ```

## `components/finance/AttentionLayer.tsx`

* [x] **Vérifier la propagation d’événements** et l’appel `/api/finance/attention` (OK).
* [x] **Ajouter un debounce sur les hovers** si pas déjà fait (évite le spam).

  * **Objectif** : réactivité correcte sans surcharger la route.

---

# Bloc 6 — i18n (cohérence des clés)

## `messages/{en,fr}/finance.json` & `messages/{en,fr}/dashboard.json`

* [x] **Garder les clés en phase** quand on touche `ChartToolbar` (labels timeframe / split / tooltips).

  * **Action** : si on renomme/ajoute des contrôles, mettre à jour EN & FR.
  * **Objectif** : maintenir `tests/i18n/key-check.test.ts` au vert.

---

# Bloc 7 — Sécurité & CI (finition)

## `.github/workflows/playwright.yml`

* [x] **Conserver** les étapes `ensure-no-only-fixme.ts` et `count-tests.ts` (déjà en place).
* [x] **Ajouter** l’étape **Guard PPR** (cf. Bloc 0).

## `package.json`

* [x] **Vérifier** que `pretest:e2e` garde `rm -rf .next && PLAYWRIGHT=True pnpm build` (OK).
* [x] **Optionnel** : script `test:e2e:local` (port 3000) pour devs, mais E2E CI reste sur 3110.

  * **Objectif** : éviter les confusions locales.

  **Exemple**

  ```json
  {
    "scripts": {
      "test:e2e:local": "PLAYWRIGHT=True pnpm exec playwright test -c playwright.config.ts --project=chromium --headed"
    }
  }
  ```

---

# Bloc 8 — Docs (éviter faux positifs de la barrière PPR)

## `AGENTS.md` (et autres `*.md`)

* [x] **Remplacer** tout exemple contenant `export const experimental_ppr = true` par une variante inoffensive (ou entourer avec backticks et **changer le littéral**), *ou* laisser tel quel et **exclure `*.md`** (préféré).

  * **Objectif** : ne pas faire échouer la nouvelle étape CI.

---

# Bloc 9 — (Optionnel) Simplification des configs Playwright

## `playwright.e2e.config.ts`

* [x] **Supprimer** ce fichier s’il n’est pas utilisé par CI (script actuel ne le référence pas).

  * **Objectif** : éviter la divergence de `baseURL` entre configs.

---

# Récap “gros rochers” restants

1. **Hotfix PPR** : retirer l’export segmentaire, durcir `next.config.ts`, forcer build Playwright dans `webServer.command`, brancher la barrière PPR en CI (en excluant `*.md`).
2. **E2E robustes** : assertions d’URL indépendantes du port, attente explicite du `multimodal-input` sur `/`.
3. **Chart cleanup** : `ChartPanel.tsx` désabonne/retire proprement (ResizeObserver, listeners, bus, chart.remove).
4. **Hygiène ESLint** : imports `useDebounce`, `clsx` (alias), `useEffect/useState` nommés.
5. **AnalysesCard test** : dé-SKIP quand `/` est revenu au vert.

Quand ces points sont faits, on relance la suite : les 500 disparaissent, l’input `multimodal-input` est présent, et les E2E `chat.*`, `home-bento.*`, `artifacts.*` doivent passer. Ensuite, on pourra raffiner perf & UX (mutualisation fetch multi-split, micro-debounce hovers, etc.).

---

## Historique

* 2025-08-19: retrait de l’export PPR segmentaire, durcissement `next.config.ts`, build Playwright forcé, garde-fou CI, stabilisation des tests (URLs agnostiques, preflight, smoke home), nettoyage `ChartPanel`, corrections d’imports, suppression `playwright.e2e.config.ts`.
* 2025-08-19: mutualisation des fetchs OHLC dans `ChartGrid`, ajout du script `test:e2e:local`.
* 2025-08-19: debounce de la persistance des annotations, retrait du SKIP sur `AnalysesCard`, vérification des clés i18n.
* 2025-08-19: ajout d'un test unitaire garantissant le cleanup de `ChartPanel`.
* 2025-08-19: cookies E2E rendus indépendants du port (usage de `domain`/`path`).
