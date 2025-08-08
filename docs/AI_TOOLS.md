# AI Tools

Cette page décrit les outils IA disponibles pour l'agent financier.

## get-chart
- **Paramètres**: `symbol`, `interval`
- **Rôle**: retourne l'URL `/api/market/${symbol}/candles/${interval}` et une configuration de graphique pour afficher les bougies.

## highlight-price
- **Paramètres**: `symbol`, `price`, `level`, `message`
- **Rôle**: diffuse un évènement sur le canal `ai-events` pour annoter le graphique à un niveau de prix donné.

## scan-opportunities
- **Rôle**: recherche les symboles avec le meilleur sentiment `news_sentiment` et confirme un breakout au-dessus de l'EMA 20.

### emitArtifact
- **Paramètres**: `limit`, `emitArtifact='research-opportunity'`
- **Rôle**: crée un document listant les opportunités identifiées.

## analyse-asset
- **Rôle**: fusionne fondamentaux, sentiment 24 h et tendance EMA 20 pour fournir une analyse synthétique d'un symbole.

### emitArtifact
- **Paramètres**: `symbol`, `emitArtifact='research-asset'`
- **Rôle**: génère un document de recherche détaillant fondamentaux, sentiment et technique.

## analyse-fa-ta
- **Rôle**: combine fondamentaux et indicateurs techniques (EMA20, RSI14) pour suggérer une stratégie et une configuration de graphique.

### emitArtifact
- **Paramètres**: `symbol`, `emitArtifact='research-fa-ta'`
- **Rôle**: crée un document de recherche FA+TA avec stratégie.

## research-general
- **Rôle**: propose un plan de recherche générique pour n'importe quel sujet.

### emitArtifact
- **Paramètres**: `topic`, `emitArtifact='research-general'`
- **Rôle**: sauvegarde le plan dans un document de type `research-general`.
