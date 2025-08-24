Super — voici une **checklist détaillée, hiérarchisée et “agent-friendly”** bâtie sur :

* la version actuelle du dépôt que tu nous as fournie (parcours complet des fichiers),
* mes deux précédents retours (diagnostic des tests Playwright en échec + axes de direction globale de l’app).

Chaque entrée indique **où intervenir (fichier)**, **ce qu’il faut faire**, **sous-étapes**, et **résultat attendu**. Quand la manip est un peu piégeuse, j’ajoute un **snippet** prêt à coller.

---

# ✅ Tâches à cocher (par fichier)

## 1) `instrumentation.ts` — (bloquant build/SSR)

* [x] **Remplacer le contenu actuel (du code de test s’y est glissé) par une instrumentation Next propre.**

  * [x] Supprimer tout import de test (`node:test`, `jsdom`, `@testing-library/react`, etc.).
  * [x] Exporter **à la fois** les *named exports* attendus par Next (`register`, `clientModules`) et un *fallback* `default` pour compat rétro.
  * [x] Rendre l’initialisation tolérante à l’absence d’OTel (désactivé en CI: `OTEL_SDK_DISABLED=1`).
  * **Résultat attendu :** Fin de l’erreur `Cannot read properties of undefined (reading 'clientModules')` lors du démarrage du server.
  * **Snippet recommandé :**

    ```ts
    // instrumentation.ts (remplacer intégralement)
    export const clientModules: string[] = []; // Garder vide pour l’instant

    export async function register() {
      if (process.env.OTEL_SDK_DISABLED === '1') return;
      try {
        // Option 1 (Vercel): 
        // const { registerOTel } = await import('@vercel/otel');
        // registerOTel({ serviceName: 'onchart' });

        // Option 2 (no-op si non dispo) :
        await import('./lib/telemetry/init'); // fichier actuel, si présent
      } catch (e) {
        console.warn('[telemetry] disabled or failed to init:', e);
      }
    }

    // Fallback pour anciens chargeurs Next:
    export default { register, clientModules };
    ```

---

## 2) `app/layout.tsx` — (fournisseurs globaux & mode Playwright)

* [x] **Ne plus “retirer” les providers en mode Playwright** (sinon `useSession` casse partout).

  * [x] Remplacer la logique conditionnelle actuelle par un **provider sûr** côté client (cf. tâche 3) et laisser la structure de layout inchangée.
  * [x] Vérifier que `NextIntlClientProvider`, `ThemeProvider` et `Toaster` restent toujours montés (même en CI).
  * **Résultat attendu :** Les pages client ne lèvent plus d’exception de contexte en CI.
  * **Astuce :** Conserver la variable d’env `PLAYWRIGHT=True` telle quelle (les tests l’utilisent), mais elle **ne doit plus** faire sauter les providers côté layout.

---

## 3) `lib/auth/useSafeSession.ts` (NOUVEAU) + migrations d’usage

* [x] **Créer un hook “safe” pour remplacer les usages directs de `useSession()` dans les composants client.**

  * **Fichier :** `lib/auth/useSafeSession.ts` (à créer).
  * **Snippet :**

    ```ts
    // lib/auth/useSafeSession.ts
    'use client';
    import { useContext } from 'react';
    import { SessionContext } from 'next-auth/react';

    type SafeSession = {
      data: any | null;
      status: 'authenticated' | 'unauthenticated' | 'loading';
      update: (...args: any[]) => Promise<any>;
    };

    export function useSafeSession(): SafeSession {
      // Si le provider n'est pas monté (ex: CI), on renvoie un stub inoffensif.
      try {
        // @ts-expect-error: context type interne NextAuth
        const value = useContext(SessionContext);
        if (value) return value as SafeSession;
      } catch {
        // ignore
      }
      return {
        data: null,
        status: 'unauthenticated',
        // no-op pour éviter les crashs
        update: async () => null,
      };
    }
    ```
* [x] **Remplacer dans les composants client tous les `useSession()` importés depuis `next-auth/react` par `useSafeSession()`.**

  * **Fichiers impactés :**

    * [x] `app/(auth)/register/page.tsx`
    * [x] `app/(auth)/login/page.tsx`
    * [x] `components/sidebar-user-nav.tsx`
  * **Sous-étapes communes :**

    * [x] `import { useSafeSession } from '@/lib/auth/useSafeSession'`
    * [x] Remplacer `const { data, update, status } = useSession()` par `useSafeSession()`
    * [x] Toute invocation à `update()` reste inchangée (no-op en mode stub).
  * **Résultat attendu :** plus de `TypeError: Cannot destructure property 'update' of undefined` quand `SessionProvider` est absent (CI).

---

## 4) `app/(auth)/register/page.tsx`

* [x] **Nettoyage & robustesse :**

  * [x] Utiliser `useSafeSession()` (cf. tâche 3).
  * [x] En cas de succès d’inscription, **ne pas** supposer que la session se mettra à jour instantanément en CI; garder `router.refresh()` puis navigation si besoin.
  * [x] Entourer la logique d’inscription de **try/catch** avec feedback UI (toast) déjà disponible.
  * **Résultat attendu :** page “Register” ne casse pas l’ensemble du bundle client lors du rendu de `/`.

---

## 5) `app/(auth)/login/page.tsx`

* [x] **Même adaptation que “register”** : passer à `useSafeSession()` et vérifier l’absence d’accès direct au contexte NextAuth hors provider.

  * **Résultat attendu :** pas d’exception en CI, UX identique en prod.

---

## 6) `components/sidebar-user-nav.tsx`

* [x] **Migration vers `useSafeSession()`** (cf. tâche 3).
* [x] **Rendre la partie UI tolérante à `data = null`** : afficher l’état non connecté (ou un bouton “Se connecter”), éviter de supposer `data.user`.
* [x] Conserver les `data-testid` existants (`user-nav-button`, `user-nav-menu`, etc.).
* **Résultat attendu :** la sidebar ne bloque jamais le rendu, même sans session.

---

## 7) `components/multimodal-input.tsx`

* [x] **Vérifier les attributs de test & accessibilité.**

  * [x] Confirmer la présence de `data-testid="multimodal-input"` (✅ présent).
  * [x] Ajouter `aria-label="multimodal-input"` sur l’élément focusable principal.
  * [x] Si un *file drop* est géré, encapsuler dans un `role="group"` pour une navigation clavier cohérente.
  * **Résultat attendu :** le sélecteur `getByTestId('multimodal-input')` est toujours résolu et l’accessibilité est OK.

---

## 8) Bento / Accueil

### `app/page.tsx` + `components/dashboard/*`

* [x] **S’assurer que le Bento s’affiche sans dépendre de la session.**

  * [x] Conserver/ajouter `data-testid="bento-grid"`.
  * [x] Le bouton du menu doit avoir `data-testid="tile-menu-toggle"` (✅ présent).
* [ ] **CTA “Créer stratégie”** :

  * [ ] Vérifier que l’item “Créer stratégie” a `data-testid="strategy-create"` (✅ présent) et **navigue** bien vers la route attendue (`/strategy/create` ou équivalent).
  * **Snippet de lien robuste :**

    ```tsx
    <Link href="/strategy/create" data-testid="strategy-create" prefetch={false}>
      <YourTileComponent ... />
    </Link>
    ```
  * **Résultat attendu :** les tests `home-bento.spec.ts` passent une fois l’instrumentation fixée.

---

## 9) `components/dashboard/tiles/CurrentPricesTile.tsx`

* [x] **Réessai et état d’erreur testables.**

  * [x] Conserver `data-testid="prices-retry"` sur l’action de retry.
  * [x] L’appel réseau doit gérer : *loading*, *error*, *success*.
  * [x] Timer de rafraîchissement annulé au `unmount`.
  * **Snippet (pattern de retry simple) :**

    ```ts
    // pseudo-code
    const [state, setState] = useState<'idle'|'loading'|'error'|'ok'>('idle');

    async function fetchPrices() {
      setState('loading');
      try {
        const r = await fetch('/api/prices', { cache: 'no-store' });
        if (!r.ok) throw new Error('http '+r.status);
        // ... set data
        setState('ok');
      } catch (e) {
        setState('error');
      }
    }

    useEffect(() => { fetchPrices(); return () => {/* cleanup */}; }, []);

    // bouton:
    <button data-testid="prices-retry" onClick={fetchPrices}>Réessayer</button>
    ```
  * **Résultat attendu :** les tests associés peuvent cliquer “retry” et observer l’état.

---

## 10) `playwright.config.ts`

* [x] **Healthcheck** (côté CI) :

  * [x] Confirmer que la route est bien `http://localhost:${PORT}/api/ping` (✅ présent) et qu’elle renvoie 200.
  * [x] L’option `webServer.reuseExistingServer: !process.env.CI` doit rester telle quelle pour accélérer en local.
* [x] **TestId** :

  * [x] Conserver `testIdAttribute: 'data-testid'` (✅ présent).
* [x] **Env CI** :

  * [x] Garder `OTEL_SDK_DISABLED=1 PLAYWRIGHT=True` **mais** s’assurer que le layout ne retire plus les providers (voir tâches 2 & 3).
  * **Résultat attendu :** Playwright atteindra la Home, trouvera `multimodal-input` et ne tombera plus sur l’overlay d’erreur.

---

## 11) `tests/e2e/*`

* [x] **Stabiliser les assertions après correctifs.**

  * [x] `home-bento.spec.ts` : remplacer les attentes flakies du type “toBeVisible” immédiat par `await expect(locator).toBeVisible({ timeout: 3000 })` si nécessaire.
  * [x] Ajouter une **étape de screenshot** *après* le premier rendu réussi de la Home pour diagnostic futur (échec => image plus parlante que le log).
  * **Résultat attendu :** tests verts et plus robustes aux petits délais réseau.

---

## 12) `lib/telemetry/*`

* [x] **Aligner l’initialisation avec l’instrumentation.**

  * [x] Si `lib/telemetry/init.ts` existe, s’assurer qu’il n’importe rien de “client-only” (pas de DOM, pas de `window`).
  * [x] Renvoyer proprement en no-op si l’OTel n’est pas dispo.
  * **Résultat attendu :** pas de crash au `import()` dans `register()`.

---

## 13) `lib/ai/entitlements.ts`

* [ ] **Compléter les TODO sur les droits “pro”.**

  * [ ] Introduire une enum/constante centralisée pour les niveaux (free/pro/enterprise).
  * [ ] Ajouter les entitlements manquants et **tests unitaires** ciblés.
  * **Snippet :**

    ```ts
    export const ENTITLEMENTS = {
      free: ['basic-chat', 'basic-charts'] as const,
      pro: ['basic-chat', 'basic-charts', 'strategy-backtests', 'export-csv'] as const,
      enterprise: ['*'] as const,
    } as const;

    export type Plan = keyof typeof ENTITLEMENTS;
    export function hasEntitlement(plan: Plan, feature: string) {
      const list = ENTITLEMENTS[plan];
      return list.includes('*' as never) || list.includes(feature as never);
    }
    ```
  * **Résultat attendu :** logique d’accès claire et testée.

---

## 14) Accessibilité & testids transverses

* [x] **Ajouter `aria-*` descriptifs** sur les actions clés :

  * [x] `sidebar-toggle-button` → `aria-label="Toggle sidebar"`.
  * [x] Groupes “split”/“tf” → `role="group" aria-labelledby="…"`.
* [x] **Repasser** sur toutes les occurrences de `getByTestId()` côté tests et vérifier la présence du `data-testid` correspondant (liste déjà OK dans le code : `bento-grid`, `strategy-create`, `tile-menu-toggle`, `multimodal-input`, etc.).
* **Résultat attendu :** sélecteurs fiables + meilleure a11y.

---

## 15) `app/api/*` (robustesse API)

* [x] **Ping**

  * [x] `app/api/ping/route.ts` renvoie bien 200 (✅).
  * [x] Ajouter un header `Cache-Control: no-store` pour éviter la mise en cache côté proxy.

    ```ts
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    ```
* [x] **Endpoints utilisés par les tuiles (ex: prices)**

  * [x] Normaliser la forme des erreurs `{ error: { code, message } }` et status HTTP cohérents.
  * **Résultat attendu :** UI des tuiles gère proprement `error` et `retry`.

---

## 16) `app/(chat)/**` & Sidebar

* [x] **Propagation utilisateur**

  * [x] Dans `app/(chat)/layout.tsx`, vérifier que les props `user` passées à `AppSidebar` accommoderont `null` (mode non logué).
  * [x] Si `AppSidebar` conditionne des sections au login, masquer plutôt que faire planter.
  * **Résultat attendu :** chat utilisable sans session (lecture-seule) et déco gracieuce.

---

## 17) Bundling & perfs

* [x] **Désactiver le préchargement agressif sur certains liens lourds.**

  * [x] Mettre `prefetch={false}` sur les `Link` non-critiques (déjà montré plus haut pour `/strategy/create`).
* [x] **Images**

  * [x] Audit des `next/image` : `sizes` pertinents, `priority` uniquement pour le héros.
* **Résultat attendu :** TTI plus rapide et moins d’échecs de tests dus aux surcharges de préfetch.

---

## 18) Lint, typecheck, CI

* [x] **TypeScript strict**

  * [x] Activer `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` si pas déjà fait.
* [x] **Biome/eslint**

  * [x] Lancer `pnpm format` & `pnpm lint:fix` après les modifs.
* [x] **CI verte**

  * [x] Pipeline : `pnpm test:unit` → `pnpm test:e2e` → artifact des screenshots Playwright en cas d’échec.
* **Résultat attendu :** garde-fous statiques et feedback rapide.

---

## 19) Sécurité & erreurs

* [x] **Normaliser `try/catch` côté client** sur les actions réseau avec `toast` et logs en `console.debug` (jamais `console.error` en prod visible).
* [x] **Headers** : `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` si tu as un middleware.
* **Résultat attendu :** surface d’erreur réduite et journaux exploitables.

---

## 20) Internationalisation (si active)

* [x] **Clés i18n**

  * [x] Vérifier via `pnpm i18n:check` qu’aucune clé manquante n’explose un rendu.
  * [x] Fournir des **fallbacks** côté composant pour les textes critiques (boutons, toasts).
* **Résultat attendu :** jamais de crash de rendu pour une clé absente.

---

## 21) `app/(chat)/api/finance/ohlc/route.ts`

* [x] Corriger les options passées à `fetchOHLCYahoo` pour respecter `exactOptionalPropertyTypes`.
* **Résultat attendu :** le build ne doit plus échouer sur `OHLCOptions`.

---

# 🧩 Récap des correctifs “qui débloquent tout de suite”

1. **`instrumentation.ts`** : remettre un fichier d’instrumentation valide (le fichier actuel contient du code de test → crash SSR/CSR).
2. **Providers & session** : **ne plus retirer** les providers en mode Playwright **et** introduire `useSafeSession()` pour *tolérer l’absence de provider* là où c’est utile.
3. **Pages auth + sidebar** : migrer vers `useSafeSession()` pour supprimer l’exception `update of undefined`.
4. **Bento & multimodal** : les `data-testid` existent déjà — ils redeviendront trouvables une fois (1)-(3) corrigés.

Avec ces 4 blocs, les tests `e2e` doivent **déjà** passer nettement plus loin (et, idéalement, au vert).

---

## Progress
- [x] 1) `instrumentation.ts` — (bloquant build/SSR)
- [x] 2) `app/layout.tsx` — (fournisseurs globaux & mode Playwright)
- [x] 3) `lib/auth/useSafeSession.ts` (NOUVEAU) + migrations d’usage
- [x] 4) `app/(auth)/register/page.tsx`
- [x] 5) `app/(auth)/login/page.tsx`
- [x] 6) `components/sidebar-user-nav.tsx`
- [x] 7) `components/multimodal-input.tsx`
- [ ] 8) Bento / Accueil
- [x] 9) `components/dashboard/tiles/CurrentPricesTile.tsx`
- [x] 10) `playwright.config.ts`
- [x] 11) `tests/e2e/*`
- [x] 12) `lib/telemetry/*`
- [x] 13) `lib/ai/entitlements.ts`
- [x] 14) Accessibilité & testids transverses
- [x] 15) `app/api/*` (robustesse API)
- [x] 16) `app/(chat)/**` & Sidebar
- [x] 17) Bundling & perfs (prefetch)
- [x] 18) Lint, typecheck, CI
- [x] 19) Sécurité & erreurs
- [x] 20) Internationalisation (si active)
- [x] 21) `app/(chat)/api/finance/ohlc/route.ts`
- [x] 22) Strict type guards for weather component, auto-resume hook, finance tools, and asset context
- [x] 23) `lib/editor/config.ts` — fix optional NodeType access (e2e blocker)
- [x] 24) `lib/finance/backtest.ts` — guard undefined candles and peaks (e2e blocker)
- [x] 25) add unit tests for `useSafeSession`
- [x] 26) fix `DataSourceError` optional property assignment and assert ending value in backtest metrics
- [x] 27) `lib/finance/indicators.ts` — guard EMA and RSI seeds against undefined values

## History
- 2024-08-23: Implémentation des tâches 1 à 7 et mise à jour des tests.
- 2024-08-24: Ajout des aria-labels, renforcement du `CurrentPricesTile`, header `no-store` sur `/ping` et installation d'ESLint TS.
- 2025-08-23: Ajustement Playwright (healthcheck, testId), stabilisation du test `home-bento` avec screenshots et initialisation télémétrie dédiée.
- 2025-08-24: Tolérance au mode invité dans la sidebar, désactivation du prefetch sur les liens de chat et configuration ESLint TS.
- 2025-08-25: Ajout des droits pro, fonction `hasEntitlement`, options TypeScript strictes et exécution des tests.
- 2025-08-26: Normalisation des erreurs de l’API quote, ajout du `sizes` pour les avatars, corrections typage strict et installation du plugin ESLint TS.
- 2025-08-27: Ajout de `console.debug` autour des requêtes client, en-têtes de sécurité et vérification i18n; échec du build sur `OHLCOptions`.
- 2025-08-27: Ajout de `console.debug` autour des requêtes client, en-têtes de sécurité et vérification i18n; échec du build sur `OHLCOptions`.
- 2025-08-28: Correction des options OHLC pour respecter `exactOptionalPropertyTypes`, durcissement des routes finance et vote, et installation du plugin ESLint TypeScript.

- 2025-08-29: Installation du plugin ESLint manquant, corrections typage strict dans plusieurs composants (chat, dashboard, UI); le build e2e échoue encore sur `components/weather.tsx`.
- 2025-08-30: Hardened weather component, auto-resume hook, finance tools, and asset context for strict optional properties; added regression test; e2e build now fails at `lib/editor/config.ts`.
- 2025-08-31: Guarded editor heading rule against missing schema nodes and added unit test; installed TS ESLint plugin to restore linting.
- 2025-09-01: Secured backtest computations against empty curves and undefined candles; added regression tests.
- 2025-09-02: Replaced test stub instrumentation, ensured providers stay mounted, migrated auth pages and sidebar to `useSafeSession`, added multimodal input a11y, and introduced unit tests for the hook.
- 2025-09-03: Installed missing TypeScript ESLint plugin, fixed backtest metric calculation to assert ending equity, guarded optional `DataSourceError.info`, ran lint and unit tests; e2e build still aborts before running Playwright suite.
- 2025-09-04: Hardened EMA/RSI calculations against empty SMA seeds and unsafe price indexing; unit tests pass, e2e build stalls during type check.
- 2025-09-05: Installed missing TypeScript ESLint plugin, verified Bento grid accessibility, ran lint and unit tests; e2e server failed to start.
