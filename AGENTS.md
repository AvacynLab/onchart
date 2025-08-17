# app/(chat)/api/finance/quote/route.ts

* [x] Ajouter un **fallback equity Stooq** quand Yahoo échoue

  * [x] `import { fetchDailyStooq } from '@/lib/finance/sources/stooq'`
  * [x] Dans le `catch` de Yahoo, si **non-crypto**, appeler Stooq et calculer `price`, `change`, `changePercent` depuis les 2 dernières clôtures
  * [x] Retourner `marketState: 'CLOSED'` pour ce fallback
  * **Objectif :** `/api/finance/quote?symbol=AAPL` et `MSFT` retournent 200 même si Yahoo renvoie 5xx.

* [x] Conserver le **fallback crypto Binance** si Yahoo échoue

  * [x] Mapper `BTC-USD` → `BTCUSDT` (voir `normalizeSymbol` / mapping dédié)
  * [x] Utiliser 2 klines (`interval=1m`, `limit=2`) pour `price` et `changePercent` dérivés
  * [x] Retourner `marketState: 'REG'` (flux continu)
  * **Objectif :** `/api/finance/quote?symbol=BTC-USD` stable sans Yahoo.

* [x] **Cache** par symbole

  * [x] `getCache('quote:${symbol}')` avant appels, `setCache(..., 15_000)` intraday, `60_000` pour daily (Stooq)
  * **Objectif :** éviter le martelage réseau et lisser l’UI.

* [x] **Runtime** explicite

  * [x] `export const runtime = 'nodejs'` (déjà si présent, vérifier)
  * **Objectif :** éviter des surprises en Edge (CORS, fetch cross-origin).

* [x] **Journaliser la source** (DEV)

  * [x] Ajouter un champ `source: 'yahoo' | 'binance' | 'stooq'` dans la réponse (ou `x-quote-source` header)
  * **Objectif :** débogage plus simple en local.

* [x] Codes d’erreur cohérents

  * [x] Si tous les fallbacks échouent : `return new Response(JSON.stringify({ error: 'failed to fetch quote' }), { status: 502 })`
  * **Objectif :** faire correspondre les logs à l’état réseau réel.

# lib/finance/live.ts

* [x] **Base URL robuste** pour les fetch internes vers `/api/finance/quote`

  * [x] Si SSR : dériver `origin` via `headers()` (`x-forwarded-proto` + `x-forwarded-host`) avec fallback `localhost:3000`
  * [x] N’utiliser `NEXT_PUBLIC_VERCEL_URL` qu’en production si défini
  * **Objectif :** éviter les 502 “proxy” en Codespaces/containers.

* [x] **Retry/backoff** contextualisé

  * [x] Pour 502/503/504 : 3 tentatives, backoff expo + jitter (respect de `fetchWithRetry`)
  * [x] Timeout ≤ 2.5s par tentative
  * **Objectif :** réduire la latence perçue sans bloquer le render.

* [x] **No-store** confirmé

  * [x] Forcer `{ cache: 'no-store' }` lors de l’appel du routeur interne
  * **Objectif :** pas de revalidation Next qui dilue le TTL custom.

# lib/finance/request.ts

* [x] **DataSourceError** complet

  * [x] Conserver le message `Request failed: ${res.status} ${res.statusText}`
  * [x] Ajouter `info: { url, attempt, elapsedMs }` (non sensible) pour logs DEV
  * **Objectif :** traces utiles quand ça relâche.

* [x] **User-Agent** explicite

  * [x] Ajouter header UA “onchart-dev/alpha” pour sources publiques (Yahoo/Stooq)
  * **Objectif :** limiter certains refus génériques.

# lib/finance/sources/yahoo.ts

* [x] Sanity check des **erreurs Yahoo**

  * [x] Si status ≥ 500 → jeter pour activer fallback
  * [x] Si payload vide → jeter `DataSourceError('Yahoo empty payload')`
  * **Objectif :** pas de faux positifs “OK mais vide”.

# lib/finance/sources/binance.ts

* [x] **Mapping symboles**

  * [x] Ajouter utilitaire `toBinancePair('BTC-USD') -> 'BTCUSDT'`, ETH idem, et laisser passer ‘USDT’ explicite si déjà fourni
  * **Objectif :** éviter les concat maladroits (le `+ 'T'` rapide devient propre).

* [x] **Klines minimal**

  * [x] Export `fetchKlinesBinance(pair, interval, limit)` → toujours renvoyer `{ openTime, close, ... }[]` typés
  * **Objectif :** type stable pour calcul variation.

# lib/finance/sources/stooq.ts

* [x] **Daily candles** typés

  * [x] Garantir au moins 2 entrées (sinon jeter pour remonter 502)
  * [x] Normaliser symbole (suffixes `.us`, `.fr` ?) via `normalizeSymbol` (ou mapping si besoin)
  * **Objectif :** fallback equity fiable.

# lib/finance/symbols.ts

* [x] **normalizeSymbol** unifiée

  * [x] Trim, uppercase, mapping connus (e.g., `^GSPC` → `^GSPC`, `BTC-USD` conserve le trait)
  * **Objectif :** inputs homogènes sur toutes les sources.

* [x] **isCryptoSymbol**

  * [x] Détecter formats `XXX-USD` / `XXXUSDT` / `:crypto:` tag éventuel
  * **Objectif :** diriger vers Binance si Yahoo échoue.

* [x] **Mappages**

  * [x] `toBinancePair` (USD → USDT)
  * [x] (optionnel) `toStooqTicker` si certains symboles nécessitent suffixes marchés
  * **Objectif :** centraliser la logique.

# lib/finance/cache.ts

* [x] **TTL par usage**

  * [x] Exposer constantes `TTL_INTRADAY_MS=15_000`, `TTL_DAILY_MS=60_000`
  * **Objectif :** éviter les TTL “magiques” dans les routes.

* [x] **Compat Redis (futur)**

  * [x] Interface `CacheDriver` (`get`/`set`) + `InMemoryDriver` actuel
  * **Objectif :** swappable en prod sans refactor.

# app/page.tsx

* [x] **Préfetch quotes** non bloquant

  * [x] `fetchLiveQuotes(DEFAULT_SYMBOLS)` entouré d’un `try/catch` qui **dégrade** en liste vide au SSR
  * [x] Passer la data au client même si partielle
  * **Objectif :** la home s’affiche même si les quotes foirent.

* [x] **Hydratation**

  * [x] S’assurer que le client re-fetch au mount si SSR a rendu vide
  * **Objectif :** “auto-guérison” quand le réseau revient.

# components/dashboard/tiles/CurrentPricesTile.tsx

* [x] **Espace de noms i18n** correct

  * [x] `const t = useTranslations('dashboard.prices')` conservé (si Option A du loader ci-dessous)
  * **Objectif :** résoudre l’erreur `MISSING_MESSAGE`.

* [x] **Etat de repli** UI

  * [x] Si `quotes.length === 0` → rendu d’un état “hors ligne” i18n + bouton “Réessayer”
  * [x] Garde contre `undefined` : pas d’accès à `q.change` si `q` absent
  * **Objectif :** pas de crash UI quand API indispo.

* [x] **Formatage nombres** robuste

  * [x] `Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
  * [x] Signe + couleur via classe utilitaire (pas d’hypothèse sur négatif/positif sans valeur)
  * **Objectif :** affichage propre en FR/EN.

# i18n/request.ts

* [x] **Charger les messages par espace de noms** (Option A)

  * [x] `messages: { common, dashboard, finance, chat }` au lieu de spread des JSON au niveau racine
  * **Objectif :** permettre `useTranslations('dashboard.prices')`.

* [x] **Locale effective**

  * [x] Conserver détection (cookie `lang` → `Accept-Language` → défaut)
  * **Objectif :** cohérence UI et prompts.

# i18n/messages/fr/dashboard.json

* [x] **Ajouter les clés manquantes**

  * [x] `{"prices": { "title": "Cours actuels", "open": "Ouvert", "closed": "Fermé", "retry": "Réessayer", "offline": "Données indisponibles" }}`
  * **Objectif :** `dashboard.prices.*` résolu.

 * [ ] **Vérifier pluralisation / formats** si d’autres tuiles les utilisent

  * **Objectif :** pas de `MISSING_MESSAGE` ailleurs.

# i18n/messages/en/dashboard.json

* [x] **Parité des clés**

  * [x] `{"prices": { "title": "Current Prices", "open": "Open", "closed": "Closed", "retry": "Retry", "offline": "Data unavailable" }}`
  * **Objectif :** tests en EN identiques.

# components/finance/FinancePanel.tsx

* [x] **Résilience fetch OHLC**

  * [x] Gérer gracefully les 5xx de `/api/finance/ohlc` (toast + état vide chart)
  * **Objectif :** panneau ne bloque pas l’app.

* [x] **Mémoire des symboles**

  * [x] Ne stocker que symboles valides (réponse 200) dans `localStorage`
  * **Objectif :** éviter l’accumulation d’entrées invalides.

# components/finance/ChartPanel.tsx

* [x] **Garde événements UI**

  * [x] Ignorer `add_overlay` si série absente, sécuriser `focusArea` (plage non vide)
  * **Objectif :** pas d’exceptions silencieuses.

# app/(chat)/api/finance/ohlc/route.ts

* [x] **TTL distinct intraday/daily** (comme pour quote)

  * [x] `setCache(key, data, interval==='1d' ? TTL_DAILY_MS : TTL_INTRADAY_MS)`
  * **Objectif :** cohérence cache.

* [x] **Fallbacks** (si dispo)

  * [x] Yahoo → Binance pour crypto → Stooq pour daily equity
  * **Objectif :** continuité visuelle sur le chart.

# components/data-stream-handler.tsx

* [x] **Défenses artifacts**

  * [x] Si un flux SSE “artifact” arrive sans `documentId`, ignorer au lieu d’échouer
  * **Objectif :** robustesse du volet droit.

# lib/ui/events.ts

* [x] **Typage strict** des payloads d’événements (zod/typescript)

  * [x] `type UIEvent = { type: 'show_chart'; payload: { symbol: string; range: string; interval: string } } | ...`
  * **Objectif :** moins d’erreurs d’intégration tool → UI.

# app/(chat)/api/chat/route.ts

* [ ] **Messages d’erreur harmonisés**

  * [ ] Envelopper les `DataSourceError` des tools finance en un message assistant propre (sans stack)
  * **Objectif :** UX non verbeuse si une source tombe.

* [ ] **Quota invité**

  * [ ] Rejeter proprement avec un message i18n si `GUEST_MAX_ANALYSES` dépassé
  * **Objectif :** éviter comportements “cachés”.

# lib/ai/tools-finance.ts

* [x] **Surface “quote”** ajustée

  * [x] Lorsque le tool appelle quote, remonter le champ `source` pour debug (optionnel, caché à l’utilisateur)
  * **Objectif :** traçabilité des décisions LLM.

# styles / UI

* [x] **Couleurs de variation** accessibilité

  * [x] Contraste suffisant (ex. classes Tailwind par défaut OK, mais vérifier sur fond sombre/clair)
  * **Objectif :** lisibilité.

# tests/unit/finance

* [x] `symbols.test.ts`

  * [x] Tester `normalizeSymbol`, `isCryptoSymbol`, `toBinancePair`, `toStooqTicker`
  * **Objectif :** éviter régressions de mapping.

* [x] `stooq.test.ts`

  * [x] Si une seule bougie → erreur
  * [x] Si 2+ bougies → calcul `changePercent` correct
  * **Objectif :** fallback equity fiable.

* [x] `binance.test.ts`

  * [x] Klines à 2 éléments → variation calculée attendu
  * **Objectif :** variation crypto consistante.

# tests/integration/api

* [x] `quote.route.test.ts`

  * [x] Mock Yahoo 502 → crypto : 200 via Binance ; equity : 200 via Stooq ; inconnu : 502
  * [x] Cache hit : 2ᵉ appel renvoie plus vite et sans requête réseau (spy)
  * **Objectif :** valider la cascade et le cache.

* [x] `ohlc.route.test.ts`

  * [x] Même logique de fallback + TTL
  * **Objectif :** charts robustes.

# tests/e2e/home (Playwright)

* [x] **Rendu FR** sans `MISSING_MESSAGE`

  * [x] Vérifier présence du titre `Cours actuels`
  * **Objectif :** i18n fonctionnelle.

* [x] **Prix visibles** avec mock 502 Yahoo

  * [x] AAPL/MSFT affichés via Stooq, BTC via Binance
  * **Objectif :** page d’accueil survivante aux pannes.

* [x] **Etat offline**

  * [x] Si toutes les sources tombent → texte `Données indisponibles` + bouton `Réessayer`
  * **Objectif :** UX contrôlée en cas de panne.

# config / env

* [x] **.env.local** de dev

  * [x] Variables `NEXTAUTH_SECRET`, `POSTGRES_URL` (ou mode guest synthétique), `NEXT_PUBLIC_BASE_URL` si utile
  * **Objectif :** environnement reproductible.

* [x] **Docs** (README)

  * [x] Expliquer les fallbacks (Yahoo → Binance/Stooq), TTL, et limites connues en Codespaces
  * **Objectif :** onboarding rapide.

# observabilité (dev-only)

* [x] **Logger de source**

  * [x] Dans `quote/route.ts`, `console.info('[quote]', symbol, source, status)` en DEV
  * **Objectif :** corrélation directe log↔UI.

# i18n – garde-fous supplémentaires

* [x] **Script de vérification des clés**

  * [x] Petit script Node qui charge FR/EN et s’assure que les mêmes chemins existent (au moins pour `dashboard.prices`)
  * **Objectif :** pas de régression de traduction.

* [x] **Fallback au runtime**

  * [x] Dans `useTranslations`, si `MISSING_MESSAGE`, retourner la **clé** brute entre crochets (dev only)
  * **Objectif :** visibiliser clairement la clé manquante plutôt que crasher.

# sécurité / quotas (rapide)

* [x] **Limiter les symboles** (optionnel)

  * [x] Refuser des symboles exotiques si non supportés par les backends
  * **Objectif :** éviter des parcours réseau inutiles.

---

## Résultat attendu (ensemble)

* La page d’accueil **ne plante plus** : i18n résolue (`dashboard.prices.*` chargées par espace de noms) et prefetch quotes non-bloquant.
* `/api/finance/quote` retourne **200** pour AAPL/MSFT/BTC-USD malgré des 5xx Yahoo, grâce aux **fallbacks** (Stooq/Binance) et au **cache**.
* Les composants UI gèrent les **états offline** proprement, avec messages localisés.
* Les tests couvrent la cascade, le cache et les traductions, évitant les régressions.

## Historique

* 2025-08-17: initialisation de la to-do.
* 2025-08-17: chargement i18n par espaces de noms, ajout des états offline/retry dans CurrentPricesTile, traductions FR/EN mises à jour et tests adaptés.
* 2025-08-17: utilitaires de symboles (normalize, crypto, mappages) ajoutés avec tests unitaires.
* 2025-08-17: ajout des fallbacks Binance/Stooq pour les quotes, refonte du cache avec driver, DataSourceError enrichi et tests d'intégration.
* 2025-08-17: base URL robuste, retry/backoff et tests unitaires pour `lib/finance/live.ts`.
* 2025-08-17: outil de quote finance utilise l'API interne avec champ `source` et journalisation des sources activée.
* 2025-08-17: ajout du prefetch non bloquant sur la home, hydratation auto et fallbacks OHLC (Binance/Stooq) avec tests d'intégration.
* 2025-08-17: ajout d'un wrapper `useTranslations` avec fallback de clé et script de parité des traductions avec tests.
* 2025-08-17: durcissement FinancePanel (erreurs OHLC, mémoire symboles), garde événements ChartPanel, défense flux artifacts et typage strict du bus UI avec tests.
* 2025-08-17: couleurs de variation accessibles ajoutées aux prix avec variantes sombre/clair et tests correspondants.
* 2025-08-17: documentation des fallbacks Yahoo→Binance/Stooq, ajout de `.env.local.example` avec variables essentielles.
* 2025-08-17: couverture e2e du tile des prix avec fallbacks Stooq/Binance et état hors ligne.
* 2025-08-17: validation des symboles dans les routes quote/ohlc pour rejeter les entrées exotiques avec tests.
