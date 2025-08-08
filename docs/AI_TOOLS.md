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

## analyse-asset
- **Rôle**: fusionne fondamentaux, sentiment 24 h et tendance EMA 20 pour fournir une analyse synthétique d'un symbole.
