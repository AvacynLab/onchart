# API Reference

## REST Endpoints

### `GET /symbols`
Returns the list of available symbols or the user watchlist.

### `GET /candles/{symbol}/{interval}`
Retrieves stored OHLCV candles for `symbol` at the given interval.
Query parameters:
- `limit` (optional): number of recent candles (default 100).

### `GET /indicators/{symbol}/{interval}`
Provides the latest indicator values such as SMA, EMA, RSI, MACD, and Bollinger Bands.
Query parameters:
- `name` (optional): indicator name (default `sma`).

### `GET /sentiment/{symbol}`
Returns recent sentiment scores for the given symbol.

### `POST /docs`
Stores a research document and returns its identifier.

### `GET /docs/{id}`
Retrieves a previously stored research document.

### `PUT /docs/{id}`
Updates the document payload and type.

### `GET /history`
Fetches historical candles from Alpha Vantage or Twelve Data.
Query parameters:
- `symbol`: ticker to query.
- `interval`: timeframe requested.
- `provider` (optional): `av` or `twelve`.

### `GET /fundamentals`
Returns fundamental ratios and financial statements from the chosen provider.
Query parameters:
- `symbol`: ticker to query.
- `provider` (optional): `av` or `twelve`.

## WebSocket

### `GET /ws/stream`
Authenticated WebSocket that streams live ticks.
Query parameters:
- `symbols`: comma-separated list of tickers.
- `interval` (optional): requested candle interval.
- `token`: JWT for authentication.

Clients may send `{ "type": "ping", "token": "<jwt>" }` to maintain the connection.  The server replies with `{ "type": "pong" }` when the token is valid.
