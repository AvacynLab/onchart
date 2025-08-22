Voici une **checklist exhaustive et hiérarchisée** (à cocher) destinée à un agent IA. Elle s’appuie sur :

* la **version actuelle du code** que tu m’as fournie ;
* mon **diagnostic des logs Playwright** que tu as collés (2 séries différentes : l’une avec erreurs `clientModules`, l’autre avec timeout du webServer) ;
* la **direction globale** que j’ai proposée (fiabiliser l’e2e, durcir l’instrumentation Next 15 canary, alléger l’UI au chargement, télémétrie désactivable).

Chaque item précise **le fichier à modifier**, l’**objectif attendu**, et, si pertinent, un **snippet exact**.

---

# ✅ A. Harness E2E & CI — démarrages fiables et rapides

## A.1 `package.json` — reconstruire avant l’e2e et aligner les ports

* [ ] **Ajouter la build dans `pretest:e2e`**
  **Fichier**: `package.json`
  **But**: éviter « start » sur un `.next` absent → timeouts.
  **Action**: remplacer la valeur actuelle par :

  ```json
  {
    "scripts": {
      "pretest:e2e": "pnpm exec playwright install --with-deps chromium && rm -rf .next && PLAYWRIGHT=True pnpm build"
    }
  }
  ```
* [ ] **Confirmer le script `start`** (option `-p`)
  **Fichier**: `package.json`
  **But**: garantir l’écoute sur le **même port** que Playwright (`3110` par défaut).
  **Action** (si tu veux conserver le contrôle côté Playwright, laisse `start` tel quel ; sinon force le port ici) :

  ```json
  {
    "scripts": {
      "start": "next start -p ${PORT:-3000}"
    }
  }
  ```

## A.2 `playwright.config.ts` — transmettre PORT/PLAYWRIGHT au webServer + checker `/ping`

* [ ] **Fixer la commande serveur avec `env` + URL de readiness**
  **Fichier**: `playwright.config.ts`
  **But**: empêcher le mismatch de ports (Next écoutant 3000 pendant que Playwright attend 3110) et éviter que la santé du serveur dépende du rendu de `/`.
  **Action**:

  ```ts
  // en haut, PORT déjà présent
  const PORT = Number(process.env.PORT ?? 3110);

  // dans export default defineConfig({...})
  webServer: {
    command: `pnpm start -p ${PORT}`, // Next écoutera bien sur PORT
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
    // IMPORTANT: vérifier la santé via ping, pas via "/". Playwright n'accepte
    // que `url` *ou* `port`; l'URL transmet implicitement le port.
    url: `http://localhost:${PORT}/ping`,
    env: {
      PORT: String(PORT),
      PLAYWRIGHT: 'True'
    }
  },
  ```

  **Résultat attendu**: plus de `Timed out waiting 600000ms from config.webServer.` et serveur prêt dès que `/ping` répond.

## A.3 `app/ping/route.ts` — ajouter la méthode HEAD

* [ ] **Supporter `HEAD` pour la sonde**
  **Fichier**: `app/ping/route.ts`
  **But**: compat avec sondes qui font `HEAD` (certains runners/tools).
  **Action**:

  ```ts
  export async function GET() {
    return Response.json({ ok: true });
  }

  export async function HEAD() {
    return new Response(null, { status: 200 });
  }
  ```

  **Résultat attendu**: readiness OK en `GET` et `HEAD`.

## A.4 `middleware.ts` — exclure `/ping` (optionnel mais conseillé)

* [ ] **Ne pas intercepter `/ping`**
  **Fichier**: `middleware.ts`
  **But**: ne pas toucher aux entêtes/cookies pour l’endpoint santé.
  **Action** (adapter le `matcher`) :

  ```ts
  export const config = {
    matcher: ['/((?!api|_next|ping|.*\\..*).*)'],
  };
  ```

---

# ✅ B. Next 15 canary & instrumentation — stabiliser l’exécution

## B.1 `instrumentation.ts` — shim « clientModules » (déjà présent, valider)

* [ ] **Vérifier que le shim est bien chargé au boot**
  **Fichier**: `instrumentation.ts`
  **Constat**: la version actuelle contient un shim pour éviter
  `TypeError: Cannot read properties of undefined (reading 'clientModules')`.
  **But**: garder ce shim actif en prod et test.
  **Contrôle**: s’assurer que **RIEN** d’autre ne redéfinit ces globals.
  **Snippet de garde** (si besoin d’étendre) :

  ```ts
  // instrumentation.ts
  export async function register() {
    const g = globalThis as any;
    // Défense : ne redéfinir que si absent
    g.__next_require__ ??= {};
    g.__next_require__.clientModules ??= new Map();
    g.clientModules ??= g.__next_require__.clientModules;
  }
  ```

  **Résultat attendu**: plus d’erreurs « clientModules » (les logs CI initiaux les montraient ; ton code actuel les neutralise, à conserver).

## B.2 `lib/telemetry/index.ts` + `tests/telemetry/init.test.ts` — OTEL désactivable (déjà OK)

* [ ] **Valider que `OTEL_SDK_DISABLED=1` neutralise la télémétrie**
  **Fichiers**: `lib/telemetry/index.ts`, `tests/telemetry/init.test.ts`
  **Constat**: déjà implémenté et testé ✅.
  **Action**: rien, juste garder l’API stable.

---

# ✅ C. UI/Pages — robustesse au premier rendu (ce que testent `multimodal-input` & co.)

## C.1 `components/multimodal-input.tsx` — data-testid (déjà OK)

* [ ] **Confirmer la présence du `data-testid="multimodal-input"`**
  **Fichier**: `components/multimodal-input.tsx`
  **But**: les tests attendent ce sélecteur.
  **Résultat**: présent ✅.

## C.2 `app/page.tsx` + `components/bento/*` — bento visible à froid

* [ ] **Vérifier que le bento (`data-testid="bento-grid"`) est rendu sans dépendre d’un effet client**
  **Fichiers**: `app/page.tsx`, `components/bento/*`
  **But**: éviter les timeouts « waiting for ... to be visible ».
  **Action**: s’assurer que l’état initial n’est pas bloqué par un `useEffect` (SSR friendly).
  **Snippet d’exemple** (pattern à suivre si un morceau est « client-only »):

  ```tsx
  // Exemple d’un guard côté client si nécessaire, sans bloquer SSR global
  const isClient = typeof window !== 'undefined';
  return (
    <section data-testid="bento-grid" aria-busy={!isClient && 'true'}>
      {/* contenu de fallback SSR visible immédiatement */}
      {/* une fois monté, remplace par la version interactive */}
    </section>
  );
  ```

## C.3 `app/(chat)/layout.tsx` — chargement Pyodide « beforeInteractive »

* [ ] **Garder le script Pyodide, mais éviter qu’il bloque le rendu**
  **Fichier**: `app/(chat)/layout.tsx`
  **But**: le script ne doit pas empêcher `multimodal-input` d’être visible.
  **Action**: si le script est critique, s’assurer qu’il n’est pas requis pour rendre les composants attendus par les tests. Sinon, passer à `afterInteractive`.
  **Snippet**:

  ```tsx
  {/* Si non indispensable au premier rendu, préférer: */}
  <Script src="/pyodide/pyodide.js" strategy="afterInteractive" />
  ```

---

# ✅ D. API & routes — runtime et santé

## D.1 `app/api/*` — runtime Node (déjà testé OK)

* [ ] **Confirmer `runtime = 'nodejs'` pour les routes finance**
  **Fichiers**: `app/api/finance/*/route.ts`
  **But**: uniformiser l’exécution pendant l’e2e.
  **Action**: si un route manque de directive runtime, ajouter :

  ```ts
  export const runtime = 'nodejs';
  ```

  **Résultat**: aligné avec les tests `tests/api/finance/runtime.node.test.ts` ✅.

## D.2 `app/api/chat/route.ts` — chemin heureux minimal

* [ ] **Garantir que POST /api/chat répond très vite sur CI**
  **But**: ne pas dépendre d’un LLM réel ; stub interne si `PLAYWRIGHT=True`.
  **Action (si nécessaire)**:

  ```ts
  const isCi = process.env.PLAYWRIGHT === 'True' || process.env.CI;
  if (isCi) {
    // renvoyer un id de draft « simulé » immédiatement
    return Response.json({ id: 'draft_test', createdAt: Date.now() });
  }
  ```

---

# ✅ E. Middleware / i18n — sobriété et non-régression

## E.1 `middleware.ts` — écrire le cookie de langue sans flusher `/ping`

* [ ] **Exclure `/ping` via le matcher** (cf. A.4)
  **But**: aucune surcharge du endpoint santé.
* [ ] **Conserver la logique cookie/entêtes (déjà OK)**
  **Résultat**: tests i18n unitaires restent au vert ✅.

---

# ✅ F. Tests Playwright — robustesse et lisibilité

## F.1 Pages helpers

* [ ] **`tests/pages/chat.ts::createNewChat`** — rester idempotent
  **But**: si on est déjà sur `/chat/:id`, ne pas recharger inutilement `/`.
  **Snippet**:

  ```ts
  async createNewChat() {
    const url = this.page.url();
    if (!/\/chat\//.test(url)) {
      await this.page.goto('/');
    }
    await this.page.getByTestId('multimodal-input').waitFor({ state: 'visible' });
    await expect(this.page.getByTestId('bento-grid')).toBeVisible();
  }
  ```

## F.2 Attentes explicites sur les éléments clés

* [ ] **Remplacer `waitFor({state:'visible'})` par `toBeVisible({timeout: ...})` là où pertinent**
  **But**: remonter des erreurs plus parlantes et uniformes.
  **Snippet**:

  ```ts
  await expect(page.getByTestId('multimodal-input')).toBeVisible({ timeout: 20_000 });
  ```

## F.3 Débogage : conserver traces ciblées

* [ ] **`playwright.config.ts`** — activer `trace: 'retain-on-failure'` (déjà présent)
  **Action**: rien si déjà configuré ✅.

---

# ✅ G. DX & perf — petits durcissements utiles

## G.1 Enrichir `/ping`

* [ ] **Ajouter version & commit** si présents en env
  **Fichier**: `app/ping/route.ts`
  **Snippet**:

  ```ts
  export async function GET() {
    return Response.json({
      ok: true,
      version: process.env.npm_package_version,
      commit: process.env.GITHUB_SHA?.slice(0,7) ?? null
    });
  }
  ```

## G.2 `next.config.ts` — garder les flags expérimentaux au strict nécessaire

* [ ] **Vérifier `experimental.serverActions`** (utile ? si non, retirer)
  **But**: limiter la surface de régression sur canary.

---

# ✅ H. Vérifications ciblées “fait / à faire” (par rapport à mes messages précédents)

| Item recommandé                                | État dans le code               | À faire                                  |
| ---------------------------------------------- | ------------------------------- | ---------------------------------------- |
| Endpoint `/ping` pour readiness                | ✅ présent (GET)                 | ➕ ajouter `HEAD` & exclure du middleware |
| Shim `clientModules` dans `instrumentation.ts` | ✅ présent                       | 🔍 garder tel quel                       |
| Télémétrie désactivable (`OTEL_SDK_DISABLED`)  | ✅ tests verts                   | rien                                     |
| Build avant e2e                                | ❌ pas dans `pretest:e2e`        | ➕ ajouter `pnpm build`                   |
| Alignement des ports Next/Playwright           | ❌ `pnpm start` sans `PORT`/`-p` | ➕ passer `env` et `-p ${PORT}`           |
| Readiness Playwright sur `/ping`               | ❌ absent                        | ➕ ajouter `url` dans `webServer`         |
| Exclusion `/ping` du middleware                | ❌ absent                        | ➕ modifier `matcher`                     |
| Attentes e2e robustes                          | ↔︎ correctes mais strictes      | 🔧 toBeVisible avec timeouts cohérents   |

---

# ✅ I. Snippets récapitulatifs (copier-coller)

### 1) `package.json` (scripts)

```json
{
  "scripts": {
    "build": "tsx lib/db/migrate && next build",
    "start": "next start -p ${PORT:-3000}",
    "test:e2e": "tsx scripts/ci/ensure-no-only-fixme.ts && tsx scripts/ci/count-tests.ts && OTEL_SDK_DISABLED=1 PLAYWRIGHT=True pnpm exec playwright test",
    "pretest:e2e": "pnpm exec playwright install --with-deps chromium && rm -rf .next && PLAYWRIGHT=True pnpm build"
  }
}
```

### 2) `playwright.config.ts` (webServer et url)

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3110);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 240_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure'
  },
  webServer: {
    command: `pnpm start -p ${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
    url: `http://localhost:${PORT}/ping`,
    env: { PORT: String(PORT), PLAYWRIGHT: 'True' }
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
```

### 3) `app/ping/route.ts` (HEAD + version)

```ts
export const runtime = 'nodejs';

export async function GET() {
  return Response.json({
    ok: true,
    version: process.env.npm_package_version,
    commit: process.env.GITHUB_SHA?.slice(0, 7) ?? null
  });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
```

### 4) `middleware.ts` (exclure ping)

```ts
export const config = {
  matcher: ['/((?!api|_next|ping|.*\\..*).*)'],
};
```

---

# ✅ J. Post-merge : ce qu’on doit voir dans la CI

* **Tests unitaires**: restent verts (45/46 ok, 1 skip acceptable si carte Analyses non rendue sous test).
* **Playwright**:

  * plus de timeout `webServer` ;
  * la sonde `/ping` répond rapidement (200 en GET/HEAD) ;
  * les tests qui attendaient `multimodal-input` et `bento-grid` passent (plus de « waiting for ... to be visible » si le serveur est sain).
  * pas d’erreurs « `clientModules` undefined ».

---

# ✅ K. Backlog « direction globale » (court terme lié aux tests)

* [ ] **Flakes**: introduire un helper `awaitHomeReady(page)` commun à tous les tests ouvrant `/`.
* [ ] **Seeds**: prévoir des seeds sqlite spécifiques e2e si un test dépend de données (éviter latence réseau).
* [ ] **Observabilité**: enrichir les logs de boot (afficher `PORT`, `NODE_ENV`, `PLAYWRIGHT`, version).
* [ ] **Isolation**: lorsque `PLAYWRIGHT=True`, bypasser systèmes coûteux (fetch externes, workers).

---

Si tu veux, je peux générer un **diff prêt à coller** pour `package.json`, `playwright.config.ts`, `app/ping/route.ts` et `middleware.ts`.

## Progress
- [ ] A.1 `package.json` — build avant e2e et script start aligné.
- [ ] A.2 `playwright.config.ts` — commande serveur avec PORT et readiness via `/ping`.
- [ ] A.3 `app/ping/route.ts` — support GET/HEAD avec version et commit.
- [ ] A.4 `middleware.ts` — exclusion de `/ping`.
- [ ] B.1 `instrumentation.ts` — shim « clientModules » vérifié.
- [ ] C.3 `app/(chat)/layout.tsx` — script Pyodide chargé après l'interaction.
- [x] D.2 `app/api/chat/route.ts` — stub de réponse rapide en CI.
- [ ] F.1 `tests/pages/chat.ts` — helper idempotent.
- [ ] F.2 Attentes e2e — passage à `toBeVisible`.
- [ ] G.1 Enrichissement de `/ping`.

## History
- 2024-08-22: Réinitialisation de la checklist; préparation des tâches.
- 2024-08-22: Limité le stub `/api/chat` aux tests Playwright pour préserver la validation du quota invité en unitaires.
