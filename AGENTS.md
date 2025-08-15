## To-do très ciblé (sans préfixe d’URL, et persistance en BDD)

### i18n – faire disparaître `/fr` et `/en` des URL

**Option recommandée (simple & robuste) : sans i18n routing**

* [x] **Supprimer l’usage du middleware `next-intl`** (ou neutraliser son effet de rewrite/redirect).
  **Fichier** : `middleware.ts`

  * [x] Retirer `createMiddleware` de `next-intl` **ou** le remplacer par un middleware **maison** qui fait seulement :

    * [x] lecture d’un cookie `lang` si présent,
    * [x] sinon négociation depuis `Accept-Language` une fois, et **écriture** du cookie,
    * [x] **aucune** réécriture/redirection.
* [x] **Layout** `app/layout.tsx`

  * [x] Lire `cookies()` → `lang` (ou récupérer via BDD si utilisateur connecté).
  * [x] Charger les messages FR/EN correspondants.
  * [x] Fournir `NextIntlProvider` avec cette locale.
* [x] **Composant Settings** (à venir)

  * [x] Au changement de langue, **écrire le cookie `lang`** et (si connecté) **persister en BDD**.
  * [x] Re-render côté client (et invalidation côté serveur si besoin).

**Alternative (possible si tu tiens à garder le middleware de la lib)** :

* [ ] `next-intl.config.ts` → `localePrefix: 'never'`.
* [ ] `middleware.ts` → s’assurer d’**accepter les chemins non préfixés**, ne jamais rediriger selon la langue, s’appuyer sur le **cookie**.

  * Note : ce mode désactive les alternate links, à gérer manuellement si SEO requis. ([next-intl.dev][2])

### Stocker la langue en BDD

**Schéma** `lib/db/schema.ts`

* [x] Ajouter table **`UserSettings`** (si pas de table utilisateur, garder une FK vers `User`/`Account` ou, à défaut, vers `ChatId` pour un fallback par espace) :

  * [x] `id` (pk)
  * [x] `userId` (fk)
  * [x] `preferredLocale` (`'fr' | 'en'`)
  * [x] `updatedAt` (timestamp)
* [x] Index `(userId)`.

**Queries** `lib/db/queries.ts`

* [x] `getUserSettings(userId)` → retourne `preferredLocale`.
* [x] `setUserPreferredLocale(userId, locale)` → upsert.

**Utilisation**

* [x] Dans `app/layout.tsx`, si utilisateur connecté : `getUserSettings(userId)` → locale. Sinon cookie.
* [x] Dans Settings : `setUserPreferredLocale` à la sauvegarde.

### Tests à adapter

* [x] `tests/ai/prompts-i18n.test.ts` : inchangé (prompts FR/EN).
* [x] `tests/e2e/dashboard.spec.ts` : s’assurer que **changer la langue** via Settings **ne modifie pas** l’URL (assertion `page.url()` identique avant/après), et que les labels changent.
* [x] Unitaire middleware **maison** (si écrit) : pas de rewrite de path, pose/lecture cookie.
* [x] Unitaire `layout` : mock `cookies()` → rend labels correspondants.
* [x] Unitaire queries `UserSettings` : upsert + lecture.

---

## Rappel “public only” (inchangé)

* Scrapers **Yahoo/Stooq/Binance/SEC/RSS**, timeouts/retries/fallbacks, cache TTL, rate-limit.
* Prompts FR/EN avec disclaimers (“Données publiques / Not financial advice”).

---

## Historique

* 2025-08-14: initialisation de la checklist.
* 2025-08-14: middleware cookie `lang`, lecture BDD dans `layout`, table `UserSettings`, tests unitaires.
* 2025-08-14: switcher écrit cookie `lang` et persiste via `setUserPreferredLocale`, tests e2e/units mis à jour (échec e2e, test layout à écrire).
* 2025-08-14: layout test ajouté, messages statiques pour les skeletons et layout ; échec persistants des tests e2e (messages manquants).
* 2025-08-14: test e2e mis à jour pour vérifier l'URL inchangée lors du switch de langue (échec React `Expected a suspended thenable`).
* 2025-08-14: tentative de neutralisation de la session NextAuth pendant les tests pour corriger l'erreur "suspended thenable" (échec e2e persistant).
* 2025-08-14: SessionProvider rendu conditionnel sous PLAYWRIGHT et tentative de simplification de cookies(); l'erreur "Expected a suspended thenable" persiste.
* 2025-08-14: lecture du cookie `lang` via `headers()` au lieu de `cookies()`; tests e2e renvoient toujours l'erreur "Expected a suspended thenable".
