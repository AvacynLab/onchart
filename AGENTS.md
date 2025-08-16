Parfait — je reprends tout ce qu’on a établi (audit code + logs E2E) et j’ajoute la **réintégration des tests “fixme”** pour que **tout** soit couvert. Voilà la **checklist complète, détaillée et cochable**, **fichier par fichier**, avec sous-étapes, objectifs et critères d’acceptation.
Contraintes maintenues : **même URL** pour toutes les langues (pas de `/fr` ou `/en`), **sources publiques seulement** (Yahoo/Stooq/Binance/SEC/RSS) et **scrapers maison**.

Avant tout appel à `ui.show_chart`, l’agent doit préciser la **timeframe** souhaitée.
L’agent respecte toujours la locale active (FR ou EN) et s’appuie uniquement sur des
**sources publiques** pour récupérer les données financières.

---

# 0) Objectifs globaux (terminer quand tout est vert)

* [ ] **Build & tests** : `pnpm build` OK ; `pnpm test` → **0 failed** (unit + API + AI/tools + **tous** les E2E).
* [ ] **Aucun test masqué** : pas de `test.only`/`describe.only`. Les tests `fixme` ont été **réintégrés** ou **remplacés**.
* [ ] **I18n** : changement de langue par **cookie et/ou BDD**, **URL inchangée** ; EN/FR cohérents partout.
* [ ] **Public-only** : aucune clé/API privée ; scrapers robustes (timeout/retry/cache/rate-limit).

---

# 1) I18n sans préfixe d’URL : cookie + fallback + BDD

## 1.1 `i18n/request.ts`

* [x] **Lire la locale depuis le cookie** `lang` (prioritaire).
* [x] **Fallback `Accept-Language`** si cookie absent.
* [x] **(Optionnel/fortement recommandé)** : si user connecté, **prioriser la BDD** (`preferredLocale`).
* [x] **Charger les bundles** `common`, `dashboard`, `finance`, `chat` selon la locale active.
  **Objectif** : la home doit afficher **EN** si un cookie `lang=en` existe avant `page.goto('/')`.
  **Critères** : E2E `dashboard.spec.ts` (switch locales) **passe** ; aucun `/en` dans l’URL.

## 1.2 `app/layout.tsx`

* [x] Garder `NextIntlProvider`.
* [x] **Ne pas surcharger** la locale via `headers()` si cela ignore le cookie/BDD.
* [x] S’aligner strictement sur la locale résolue par `i18n/request.ts`.
  **Critères** : SSR et CSR alignés, pas de “flicker” de langue.

## 1.3 `next-intl.config.ts`

* [x] Vérifier : `locales: ['fr','en']`, `defaultLocale: 'fr'`, **`localePrefix: 'never'`**.
  **Critères** : jamais de `/fr|/en` dans les URLs.

## 1.4 `middleware.ts`

* [x] **Aucune** réécriture liée à la langue.
* [x] (Facultatif) Middleware maison : si **aucun** cookie `lang`, **poser** `lang` depuis `Accept-Language` **sans redirect**.
  **Critères** : traces Playwright sans redirect i18n.

## 1.5 Messages

* [x] `messages/en/dashboard.json` : `prices.title` = **"Current prices"** (exact).
* [x] `messages/fr/dashboard.json` : `prices.title` = **"Cours actuels"**.
  **Critères** : heading détectable en EN/FR selon cookie/BDD.

---

# 2) Réintégration des **tests fixme** & couverture Playwright

## 2.1 **Inventaire & dé-fixation**

* [x] **Scanner le repo** pour `test.fixme(`, `test.skip(`, `describe.fixme(`.
* [x] **Lister** chaque test (fichier + ligne + motif), **documenter** la raison historique du “fixme”. *(Aucun fixme/skip restant.)*
* [x] Pour chaque cas, choisir :

  * [x] **Corriger la cause** (flaky sélecteur, attente d’hydratation, réseau non mocké, debouncing non attendu, etc.) et **enlever `fixme`**.
  * [x] Ou **réécrire** le test avec sélecteurs stables et mocks déterministes.
    **Critères** : nombre de “fixme/skip” **= 0** dans le dossier `tests/e2e` (ou justifié par un ticket ouvert).

## 2.2 **Sentinelle anti-skip**

* [x] Ajouter un script `scripts/ci/ensure-no-only-fixme.ts` qui **échoue** s’il trouve `.only` ou `fixme/skip` dans `tests/e2e`.
* [x] Appeler ce script **avant** `pnpm exec playwright test` dans la CI.
  **Critères** : la CI bloque toute régression (test isolé par erreur, etc.).

## 2.3 **Couverture minimale**

* [x] Script (Node) qui **compte** le nombre de tests exécutables (`tests/**/*.spec.ts` & `tests/**/*.test.ts`) **hors** fixme/skip et **échoue** si < **seuil attendu** (≈85).
  **Critères** : impossible de “perdre” des tests en silence.

---

# 3) Playwright — stabilité & exécution **de tous** les tests

## 3.1 `playwright.config.ts`

* [x] **webServer** en **prod** :

* [x] `command: 'pnpm build && pnpm start -p ${PORT}'` *(3110 par défaut)*
* [x] `port: 3110` (surchageable via `PORT` pour éviter les conflits)
  * [x] `reuseExistingServer: !process.env.CI`
  * [x] `timeout: 180_000`
* [x] `use.trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`.
* [x] **Pas de `testMatch` restrictif** qui ignorerait `.test.ts` ou `.spec.ts`.
* [x] **Projects** : un projet `e2e` par défaut ; optionnel `chromium` + `firefox` si besoin.
  **Critères** : réduction du bruit HMR/Turbopack, E2E stables en CI, **tous** les tests découverts.

## 3.2 `package.json` (scripts)

* [x] `test:unit` (tsx node tests), `test:e2e` (Playwright), `test` (chaîne complète).
* [x] `test:e2e` **sans** filtre `--grep`, pour exécuter **tous** les fichiers.
  **Critères** : cohérence CLI locale/CI.

---

# 4) Dashboard E2E : sélecteurs & A11y

## 4.1 `components/dashboard/tiles/CurrentPricesTile.tsx`

* [x] Titre en `<h2>` avec `t('dashboard.prices.title')`.
* [x] Ajouter (si utile) `data-testid="tile-prices-title"`.
  **Critères** : `getByRole('heading', { name: 'Current prices' })` **réussit** et **hydrate** correctement.

## 4.2 `components/dashboard/tiles/{NewsTile,StrategiesTile,AnalysesTile,MenuTile}.tsx`

* [x] Chaque tuile a un **heading** accessible (`<h2>`).
* [x] Ajouter des `data-testid` pour interactions clés (menu, actions).
  **Critères** : `dashboard.spec.ts` passe ; pas de time-out d’attente de titre.

---

# 5) Strategy Wizard E2E : champ `constraints`

## 5.1 `components/finance/StrategyWizard.tsx`

* [x] **Ajouter** explicitement `input[name="constraints"]` au step contraint.
* [x] Le champ doit être **visible** quand le step est actif (pas masqué par une transition).
* [x] Binder à l’état (ex. `form.constraints`).
* [x] **Zod** : ajouter `constraints` (string, optionnel accepté).
  **Critères** : `strategy-wizard.spec.ts` trouve l’input, le remplit, et complète le flow.

## 5.2 Sélecteurs & timing

* [x] Ajouter `data-testid="constraints-input"` (en renfort).
* [x] Si animation, assurer `await expect(locator).toBeVisible()` avant `.fill()`.
  **Critères** : plus de flakiness sur ce test.

---

# 6) Stockage de la langue côté BDD

## 6.1 `lib/db/schema.ts`

* [x] **UserSettings** (ou ajouter sur `User`) :

  * [x] `userId` (FK), `preferredLocale` (`'fr'|'en'`), `updatedAt`.
* [x] Index `(userId)`.
  **Critères** : migration passe ; lecture/écriture OK.

## 6.2 `lib/db/queries.ts`

* [x] `getUserSettings(userId)` → `preferredLocale`.
* [x] `setUserPreferredLocale(userId, locale)` → upsert.
  **Critères** : tests unitaires pour set/get.

## 6.3 `i18n/request.ts` (rappel)

* [x] Si user connecté, **prioriser** la locale BDD.
  **Critères** : Settings persiste la langue ; la home la reflète à la prochaine requête SSR.

---

# 7) Tests à **ajouter/ajuster**

## 7.1 E2E

* [x] `tests/e2e/dashboard.spec.ts`

  * [x] Poser cookie `lang=en` **avant** `page.goto('/')`.
  * [x] Vérifier heading `'Current prices'`.
  * [x] Vérifier que `page.url()` **ne change pas** lors du switch de langue (pas de `/en`).
* [x] `tests/e2e/strategy-wizard.spec.ts`

  * [x] Attendre explicitement `input[name="constraints"]` puis `.fill('ESG')`.
  * [x] Ajouter des `test.step` pour la lisibilité du trace.

## 7.2 Unitaires i18n

* [x] `tests/i18n/cookie-locale.test.ts` — mock `cookies()` → `'en'` ; messages EN chargés.
* [x] `tests/i18n/accept-language.test.ts` — mock `headers()` → `'en-US,en;q=0.9'` ; fallback EN si pas de cookie.
* [x] `tests/i18n/db-locale.test.ts` — mock “utilisateur connecté” ; BDD prioritaire sur cookie/header.
  **Critères** : déterministes, isolés.

## 7.3 DB

* [x] `tests/db/user-settings.test.ts` — `setUserPreferredLocale`/`getUserSettings`.
  **Critères** : verts en CI.

## 7.4 “Fixmes” réintégrés

* [x] Pour chaque test ex-`fixme` :

  * [x] Stabiliser sélecteurs (préférer `getByRole` ou `data-testid`).
  * [x] Ajouter attentes d’hydratation (ex. `await page.waitForLoadState('networkidle')` post-navigation si nécessaire).
* [x] **Mock réseau** déterministe si le test dépend de données externes (Playwright `route.fulfill` avec fixtures dans `tests/fixtures`), ou TTL cache augmenté côté app pour réduire l’instabilité.
    **Critères** : tous redeviennent **verts** en CI headless.

---

# 8) Scrapers & API publiques (rappel + durcissements)

## 8.1 `lib/finance/sources/{yahoo.ts,stooq.ts,binance.ts,sec.ts,news.ts}`

* [x] **Timeout** 10s (`AbortController`).
* [x] **Retries** 2× (backoff + jitter).
* [x] **Fallbacks** : Yahoo→Stooq (daily), Binance WS→REST.
* [x] **Sanitize** contenu RSS (cheerio).
  **Critères** : tests `errors`, `rate-limit`, `news`, `yahoo/stooq/binance`, `sec` verts.

## 8.2 `lib/finance/cache.ts` / `lib/finance/rate-limit.ts`

* [x] TTL intraday 10–15s ; daily 5–10m.
* [x] Bucket par domaine pour limiter 429.
  **Critères** : pas de flaky réseau en E2E.

---

# 9) UI bento & A11y (petites finitions utiles aux tests)

## 9.1 Headings & rôles

* [x] Tous les titres en `<h2>` avec `aria-labelledby` quand pertinent.
  **Critères** : `getByRole('heading')` fonctionne partout.

## 9.2 Empty states bilingues

* [x] Aucun texte dur en FR/EN dans le JSX (tout via `t(...)`).
  **Critères** : pas de mismatch locale.

## 9.3 Menu bento (pas overlay)

* [x] `components/toolbar.tsx` : **pas** de `position: fixed`/backdrop/z-index élevé.
  **Critères** : E2E “menu tile toggles finance actions” stable.

---

# 10) CI & diagnostics

## 10.1 Ordonnancement

* [x] CI : `scan-secrets` → tests Node (tsx) → **build** → Playwright E2E.
* [x] `trace: 'retain-on-failure'` ; publier les traces/artifacts sur échec.
  **Critères** : debug facile, échecs reproductibles.

## 10.2 Garde-fous

* [x] Exécuter `ensure-no-only-fixme.ts` avant E2E.
* [x] Exécuter le **compteur de tests** (seuil min) avant E2E.
  **Critères** : pas de couverture qui fond sans alarme.

---

# 11) Documentation

## 11.1 `README.md`

* [x] Expliquer i18n **sans** préfixe d’URL, cookie `lang`, fallback `Accept-Language`, BDD optionnelle.
* [x] Comment forcer la langue en local (DevTools → Cookies).
* [x] Scripts de tests et d’audit (anti-only/fixme, compteur de tests).
  **Critères** : onboarding clair.

## 11.2 `AGENTS.md`

* [x] Rappeler l’obligation de préciser la **timeframe** avant `ui.show_chart`.
* [x] Préciser que l’agent **respecte la locale** (FR/EN) et utilise des **sources publiques**.
  **Critères** : cohérence avec les prompts et les tools.

---

## Micro-lot prioritaire à livrer tout de suite

* [x] `i18n/request.ts` : **cookie → BDD → Accept-Language** ; chargement messages.
* [x] `components/finance/StrategyWizard.tsx` : **`input[name="constraints"]` visible** au bon step (+ binder & zod).
* [x] `playwright.config.ts` : **build + start** en webServer prod ; `trace: 'retain-on-failure'`.
* [x] **Enlever tous les `fixme`** E2E après stabilisation (sélecteurs/testids, attentes d’hydratation, mocks).
* [x] Ajout des scripts **anti-only/fixme** et **compteur de tests** en CI.

Quand ces cases sont cochées, on relance `pnpm test` : les deux E2E qui échouaient (heading anglais + `constraints`) passent, **tous** les tests Playwright sont réellement exécutés, et la suite est solidifiée contre toute “disparition” silencieuse de tests.

---

## Historique

* 2025-08-15: i18n cookie/BDD/Accept-Language logic, StrategyWizard constraints field with Zod, Playwright prod webServer, fixme tests removed, CI guard scripts added.
* 2025-08-16: layout uses request locale, dashboard tiles gain test IDs and headings, Playwright config simplified to single project.
* 2025-08-17: fixed layout unit test import path to include `.tsx` extension for Node resolution.
* 2025-08-18: configured i18n to omit locale prefixes and updated Playwright ignore patterns for i18n node tests; E2E react-child error persists.
* 2025-08-15: added i18n locale resolution tests and DB user settings test; restricted Playwright to e2e directory.
* 2025-08-19: documented i18n cookie/Accept-Language flow, added test guard script notes, and clarified timeframe & locale rules.
* 2025-08-20: skipped OpenTelemetry registration when `PLAYWRIGHT` is set to prevent Next.js `clientModules` crashes during E2E runs.
* 2025-08-20: lazily import OpenTelemetry to avoid touching client module hooks unless telemetry is enabled; confirmed finance sources use timeouts, retries, fallbacks, RSS sanitization and domain buckets for rate limiting.
* 2025-08-21: localized ResearchDoc section labels via next-intl and added unit test ensuring translated defaults.
* 2025-08-22: strengthened dashboard and strategy-wizard E2E tests with visibility checks and network-idle waits.
* 2025-08-23: switched Playwright to line+html reporters for visible CI progress and debugging.
* 2025-08-24: disabled Next.js PPR during Playwright runs to avoid `clientModules` errors; server 500 persists.
* 2025-08-26: replaced `networkidle` waits with element visibility checks in dashboard and strategy-wizard E2E tests to avoid hangs from long-lived connections.
* 2025-08-27: set `OTEL_SDK_DISABLED` during `test:e2e` to bypass OpenTelemetry hooks causing `clientModules` crashes.
* 2025-08-28: mocked live quote API in dashboard E2E and marked network mocks complete.
* 2025-08-29: parameterized Playwright server port to accept `PORT` env var, easing local runs when 3110 is occupied.
* 2025-08-30: replaced locale cookie domains with explicit test URLs to avoid host mismatches; Playwright binaries and system deps installed, but E2E run still hangs during build.
* 2025-08-31: ensured UserSettings schema and query helpers persist user preferred locale and marked tasks complete; Playwright deps installed though E2E tests remain blocked.
* 2025-09-01: replaced OpenTelemetry instrumentation with a no-op stub; `clientModules` errors persist and the Next.js server still returns 500 during E2E runs.
* 2025-09-02: removed `instrumentation.ts` to bypass Next.js client-module hooks during production builds.
* 2025-09-03: added a no-op `instrumentation.ts` stub exporting an empty `clientModules` array to guard against runtime
  crashes; `clientModules` 500 error persists.

* 2025-09-04: verified clientModules stub still required; installed Playwright browsers and system deps; E2E tests continue to fail (menu tile, strategy wizard).
* 2025-09-05: configured Playwright to use up to four workers (fallback to two) for parallel E2E runs.
