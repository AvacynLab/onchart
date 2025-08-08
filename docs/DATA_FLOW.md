# Flux de données

```plantuml
@startuml
actor Trader
cloud YahooWS
cloud AlphaVantage
cloud NewsRSS
cloud Twitter
cloud Reddit

rectangle "Market Worker" as MW
rectangle "News Worker" as NW
rectangle "Reddit/Twitter Worker" as SW
queue Redis
rectangle DB
rectangle API
rectangle Frontend

YahooWS --> MW
AlphaVantage --> MW
MW --> Redis
MW --> DB
Redis --> API
NW --> DB
SW --> DB
DB --> API
API --> Frontend
Trader --> Frontend
@enduml
```

Ce schéma illustre la collecte de données de marché et de sentiment, leur stockage dans Postgres et la diffusion en temps réel. Les travailleurs publient les ticks sur Redis, les routes API WebSocket les relaient ensuite vers le navigateur où les graphiques se mettent à jour instantanément.
