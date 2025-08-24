Super — voici une **checklist détaillée, hiérarchisée et “agent-friendly”** bâtie sur :

* la version actuelle du dépôt que tu nous as fournie (parcours complet des fichiers),
* mes deux précédents retours (diagnostic des tests Playwright en échec + axes de direction globale de l’app).

Chaque entrée indique **où intervenir (fichier)**, **ce qu’il faut faire**, **sous-étapes**, et **résultat attendu**. Quand la manip est un peu piégeuse, j’ajoute un **snippet** prêt à coller.

---

# ✅ Tâches à cocher (par fichier)

## 1) `instrumentation.ts` — (bloquant build/SSR)

* [ ] **Remplacer le contenu actuel (du code de test s’y est glissé) par une instrumentation Next propre.**

  * [ ] Supprimer tout import de test (`node:test`, `jsdom`, `@testing-library/react`, etc.).
  * [ ] Exporter **à la fois** les *named exports* attendus par Next (`register`, `clientModules`) et un *fallback* `default` pour compat rétro.
  * [ ] Rendre l’initialisation tolérante à l’absence d’OTel (désactivé en CI: `OTEL_SDK_DISABLED=1`).
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

* [ ] **Ne plus “retirer” les providers en mode Playwright** (sinon `useSession` casse partout).

  * [ ] Remplacer la logique conditionnelle actuelle par un **provider sûr** côté client (cf. tâche 3) et laisser la structure de layout inchangée.
  * [ ] Vérifier que `NextIntlClientProvider`, `ThemeProvider` et `Toaster` restent toujours montés (même en CI).
  * **Résultat attendu :** Les pages client ne lèvent plus d’exception de contexte en CI.
  * **Astuce :** Conserver la variable d’env `PLAYWRIGHT=True` telle quelle (les tests l’utilisent), mais elle **ne doit plus** faire sauter les providers côté layout.

---

## 3) `lib/auth/useSafeSession.ts` (NOUVEAU) + migrations d’usage

* [ ] **Créer un hook “safe” pour remplacer les usages directs de `useSession()` dans les composants client.**

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
* [ ] **Remplacer dans les composants client tous les `useSession()` importés depuis `next-auth/react` par `useSafeSession()`.**

  * **Fichiers impactés :**

    * [ ] `app/(auth)/register/page.tsx`
    * [ ] `app/(auth)/login/page.tsx`
    * [ ] `components/sidebar-user-nav.tsx`
  * **Sous-étapes communes :**

    * [ ] `import { useSafeSession } from '@/lib/auth/useSafeSession'`
    * [ ] Remplacer `const { data, update, status } = useSession()` par `useSafeSession()`
    * [ ] Toute invocation à `update()` reste inchangée (no-op en mode stub).
  * **Résultat attendu :** plus de `TypeError: Cannot destructure property 'update' of undefined` quand `SessionProvider` est absent (CI).

---

## 4) `app/(auth)/register/page.tsx`

* [ ] **Nettoyage & robustesse :**

  * [ ] Utiliser `useSafeSession()` (cf. tâche 3).
  * [ ] En cas de succès d’inscription, **ne pas** supposer que la session se mettra à jour instantanément en CI; garder `router.refresh()` puis navigation si besoin.
  * [ ] Entourer la logique d’inscription de **try/catch** avec feedback UI (toast) déjà disponible.
  * **Résultat attendu :** page “Register” ne casse pas l’ensemble du bundle client lors du rendu de `/`.

---

## 5) `app/(auth)/login/page.tsx`

* [ ] **Même adaptation que “register”** : passer à `useSafeSession()` et vérifier l’absence d’accès direct au contexte NextAuth hors provider.

  * **Résultat attendu :** pas d’exception en CI, UX identique en prod.

---

## 6) `components/sidebar-user-nav.tsx`

* [ ] **Migration vers `useSafeSession()`** (cf. tâche 3).
* [ ] **Rendre la partie UI tolérante à `data = null`** : afficher l’état non connecté (ou un bouton “Se connecter”), éviter de supposer `data.user`.
* [ ] Conserver les `data-testid` existants (`user-nav-button`, `user-nav-menu`, etc.).
* **Résultat attendu :** la sidebar ne bloque jamais le rendu, même sans session.

---

## 7) `components/multimodal-input.tsx`

* [ ] **Vérifier les attributs de test & accessibilité.**

  * [ ] Confirmer la présence de `data-testid="multimodal-input"` (✅ présent).
  * [ ] Ajouter `aria-label="multimodal-input"` sur l’élément focusable principal.
  * [ ] Si un *file drop* est géré, encapsuler dans un `role="group"` pour une navigation clavier cohérente.
  * **Résultat attendu :** le sélecteur `getByTestId('multimodal-input')` est toujours résolu et l’accessibilité est OK.

---

## 8) Bento / Accueil

### `app/page.tsx` + `components/dashboard/*`

* [ ] **S’assurer que le Bento s’affiche sans dépendre de la session.**

  * [ ] Conserver/ajouter `data-testid="bento-grid"`.
  * [ ] Le bouton du menu doit avoir `data-testid="tile-menu-toggle"` (✅ présent).
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

* [ ] **Réessai et état d’erreur testables.**

  * [ ] Conserver `data-testid="prices-retry"` sur l’action de retry.
  * [ ] L’appel réseau doit gérer : *loading*, *error*, *success*.
  * [ ] Timer de rafraîchissement annulé au `unmount`.
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

* [ ] **Healthcheck** (côté CI) :

  * [ ] Confirmer que la route est bien `http://localhost:${PORT}/api/ping` (✅ présent) et qu’elle renvoie 200.
  * [ ] L’option `webServer.reuseExistingServer: !process.env.CI` doit rester telle quelle pour accélérer en local.
* [ ] **TestId** :

  * [ ] Conserver `testIdAttribute: 'data-testid'` (✅ présent).
* [ ] **Env CI** :

  * [ ] Garder `OTEL_SDK_DISABLED=1 PLAYWRIGHT=True` **mais** s’assurer que le layout ne retire plus les providers (voir tâches 2 & 3).
  * **Résultat attendu :** Playwright atteindra la Home, trouvera `multimodal-input` et ne tombera plus sur l’overlay d’erreur.

---

## 11) `tests/e2e/*`

* [ ] **Stabiliser les assertions après correctifs.**

  * [ ] `home-bento.spec.ts` : remplacer les attentes flakies du type “toBeVisible” immédiat par `await expect(locator).toBeVisible({ timeout: 3000 })` si nécessaire.
  * [ ] Ajouter une **étape de screenshot** *après* le premier rendu réussi de la Home pour diagnostic futur (échec => image plus parlante que le log).
  * **Résultat attendu :** tests verts et plus robustes aux petits délais réseau.

---

## 12) `lib/telemetry/*`

* [ ] **Aligner l’initialisation avec l’instrumentation.**

  * [ ] Si `lib/telemetry/init.ts` existe, s’assurer qu’il n’importe rien de “client-only” (pas de DOM, pas de `window`).
  * [ ] Renvoyer proprement en no-op si l’OTel n’est pas dispo.
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

* [ ] **Ajouter `aria-*` descriptifs** sur les actions clés :

  * [ ] `sidebar-toggle-button` → `aria-label="Toggle sidebar"`.
  * [ ] Groupes “split”/“tf” → `role="group" aria-labelledby="…"`.

* [ ] **Repasser** sur toutes les occurrences de `getByTestId()` côté tests et vérifier la présence du `data-testid` correspondant (liste déjà OK dans le code : `bento-grid`, `strategy-create`, `tile-menu-toggle`, `multimodal-input`, etc.).
* **Résultat attendu :** sélecteurs fiables + meilleure a11y.

---

## 15) `app/api/*` (robustesse API)

* [ ] **Ping**

  * [ ] `app/api/ping/route.ts` renvoie bien 200 (✅).
  * [ ] Ajouter un header `Cache-Control: no-store` pour éviter la mise en cache côté proxy.

    ```ts
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    ```
* [ ] **Endpoints utilisés par les tuiles (ex: prices)**

  * [ ] Normaliser la forme des erreurs `{ error: { code, message } }` et status HTTP cohérents.
  * **Résultat attendu :** UI des tuiles gère proprement `error` et `retry`.

---

## 16) `app/(chat)/**` & Sidebar

* [ ] **Propagation utilisateur**

  * [ ] Dans `app/(chat)/layout.tsx`, vérifier que les props `user` passées à `AppSidebar` accommoderont `null` (mode non logué).
  * [ ] Si `AppSidebar` conditionne des sections au login, masquer plutôt que faire planter.
  * **Résultat attendu :** chat utilisable sans session (lecture-seule) et déco gracieuce.

---

## 17) Bundling & perfs

* [ ] **Désactiver le préchargement agressif sur certains liens lourds.**

  * [ ] Mettre `prefetch={false}` sur les `Link` non-critiques (déjà montré plus haut pour `/strategy/create`).

* [ ] **Images**

  * [ ] Audit des `next/image` : `sizes` pertinents, `priority` uniquement pour le héros.
* **Résultat attendu :** TTI plus rapide et moins d’échecs de tests dus aux surcharges de préfetch.

---

## 18) Lint, typecheck, CI

* [ ] **TypeScript strict**

  * [ ] Activer `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` si pas déjà fait.
* [ ] **Biome/eslint**

  * [ ] Lancer `pnpm format` & `pnpm lint:fix` après les modifs.
* [ ] **CI verte**

  * [ ] Pipeline : `pnpm test:unit` → `pnpm test:e2e` → artifact des screenshots Playwright en cas d’échec.
* **Résultat attendu :** garde-fous statiques et feedback rapide.

---

## 19) Sécurité & erreurs

* [ ] **Normaliser `try/catch` côté client** sur les actions réseau avec `toast` et logs en `console.debug` (jamais `console.error` en prod visible).
* [ ] **Headers** : `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` si tu as un middleware.
* **Résultat attendu :** surface d’erreur réduite et journaux exploitables.

---

## 20) Internationalisation (si active)

* [ ] **Clés i18n**

  * [ ] Vérifier via `pnpm i18n:check` qu’aucune clé manquante n’explose un rendu.
  * [ ] Fournir des **fallbacks** côté composant pour les textes critiques (boutons, toasts).
* **Résultat attendu :** jamais de crash de rendu pour une clé absente.

---

## 21) `app/(chat)/api/finance/ohlc/route.ts`

* [ ] Corriger les options passées à `fetchOHLCYahoo` pour respecter `exactOptionalPropertyTypes`.
* **Résultat attendu :** le build ne doit plus échouer sur `OHLCOptions`.

---

## 22) `components/finance/StrategyWizard.tsx`

* [ ] Corriger l’assignation dynamique pour garantir un nom de propriété de type `string` avant la fusion des réponses.
* **Résultat attendu :** `pnpm build` se compile sans erreur de type.

---

# 🧩 Récap des correctifs “qui débloquent tout de suite”

1. **`instrumentation.ts`** : remettre un fichier d’instrumentation valide (le fichier actuel contient du code de test → crash SSR/CSR).
2. **Providers & session** : **ne plus retirer** les providers en mode Playwright **et** introduire `useSafeSession()` pour *tolérer l’absence de provider* là où c’est utile.
3. **Pages auth + sidebar** : migrer vers `useSafeSession()` pour supprimer l’exception `update of undefined`.
4. **Bento & multimodal** : les `data-testid` existent déjà — ils redeviendront trouvables une fois (1)-(3) corrigés.

Avec ces 4 blocs, les tests `e2e` doivent **déjà** passer nettement plus loin (et, idéalement, au vert).

---

## Progress
- [ ] 1) `instrumentation.ts`
- [ ] 2) `app/layout.tsx`
- [ ] 3) `lib/auth/useSafeSession.ts` (NOUVEAU) + migrations d’usage
- [ ] 4) `app/(auth)/register/page.tsx`
- [ ] 5) `app/(auth)/login/page.tsx`
- [ ] 6) `components/sidebar-user-nav.tsx`
- [ ] 7) `components/multimodal-input.tsx`
- [ ] 8) Bento / Accueil
- [ ] 9) `components/dashboard/tiles/CurrentPricesTile.tsx`
- [ ] 10) `playwright.config.ts`
- [ ] 11) `tests/e2e/*`
- [x] 12) `lib/telemetry/*`
- [ ] 13) `lib/ai/entitlements.ts`
- [ ] 14) Accessibilité & testids transverses
- [ ] 15) `app/api/*` (robustesse API)
- [ ] 16) `app/(chat)/**` & Sidebar
- [ ] 17) Bundling & perfs
- [x] 18) Lint, typecheck, CI
- [ ] 19) Sécurité & erreurs
- [ ] 20) Internationalisation (si active)
- [ ] 21) `app/(chat)/api/finance/ohlc/route.ts`
- [x] 22) `components/finance/StrategyWizard.tsx`

## History
- 2025-09-07: Réinitialisation du fichier AGENTS.md avec la checklist complète.
- 2025-09-07: Retrait du top-level await de la télémétrie, correction du `StrategyWizard` et exécution des tests.
