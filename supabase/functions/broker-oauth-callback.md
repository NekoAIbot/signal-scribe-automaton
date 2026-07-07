# Broker OAuth callback configuration

Deployments should terminate broker OAuth callbacks on the backend. Exchange authorization codes server-side, store access and refresh tokens in secure server-controlled storage, then call `broker-account-sync` after account discovery.

Required environment variables by broker:

- Deriv: `DERIV_OAUTH_CLIENT_ID`, `DERIV_OAUTH_CLIENT_SECRET`, `DERIV_OAUTH_REDIRECT_URI`
- Binance: `BINANCE_OAUTH_CLIENT_ID`, `BINANCE_OAUTH_CLIENT_SECRET`, `BINANCE_OAUTH_REDIRECT_URI`
- Bybit: `BYBIT_OAUTH_CLIENT_ID`, `BYBIT_OAUTH_CLIENT_SECRET`, `BYBIT_OAUTH_REDIRECT_URI`
- Alpaca: `ALPACA_OAUTH_CLIENT_ID`, `ALPACA_OAUTH_CLIENT_SECRET`, `ALPACA_OAUTH_REDIRECT_URI`
- Interactive Brokers: `IBKR_OAUTH_CLIENT_ID`, `IBKR_OAUTH_CLIENT_SECRET`, `IBKR_OAUTH_REDIRECT_URI`
- OANDA: `OANDA_OAUTH_CLIENT_ID`, `OANDA_OAUTH_CLIENT_SECRET`, `OANDA_OAUTH_REDIRECT_URI`
