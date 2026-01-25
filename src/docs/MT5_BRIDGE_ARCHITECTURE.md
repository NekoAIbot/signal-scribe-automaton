# MT5 Bridge Architecture

## Overview

MetaTrader 5 (MT5) does not provide a native web API. To enable live trading from a web application, you need an **MT5 Bridge Server** - an intermediary service that connects your web app to the MT5 platform.

## Architecture Diagram

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│                     │     │                      │     │                 │
│   Lovable Web App   │────▶│   MT5 Bridge Server  │────▶│   MT5 Terminal  │
│   (React Frontend)  │     │   (Windows VPS)      │     │   (MetaTrader)  │
│                     │◀────│                      │◀────│                 │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
         │                           │                          │
         │                           │                          │
         ▼                           ▼                          ▼
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Supabase Cloud    │     │   REST API / WS      │     │   Broker Server │
│   - Edge Functions  │     │   - Trade Execution  │     │   - Price Feed  │
│   - Database        │     │   - Account Info     │     │   - Order Book  │
│   - Realtime        │     │   - Position Mgmt    │     │   - Execution   │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
```

## Components Required

### 1. MT5 Bridge Server (Windows VPS)

**Why Windows?** MT5 only runs on Windows. You need a Windows VPS to run both MT5 and the bridge software.

**Options:**
- **MetaApi.cloud** - Managed cloud service ($10-50/month per account)
- **MQL5 Web Gateway** - Self-hosted solution
- **Custom Python Bridge** - Using `MetaTrader5` Python package

### 2. Recommended: MetaApi.cloud

MetaApi is a managed service that provides REST and WebSocket APIs for MT5/MT4.

**Setup Steps:**
1. Sign up at [metaapi.cloud](https://metaapi.cloud)
2. Add your MT5 account credentials
3. Get your API token
4. Use their SDK or REST API

**API Example:**
```typescript
// Install: npm install metaapi.cloud-sdk
import MetaApi from 'metaapi.cloud-sdk';

const api = new MetaApi('your-token');
const account = await api.metatraderAccountApi.getAccount('account-id');
await account.waitConnected();

// Get positions
const positions = await account.getPositions();

// Place trade
const result = await account.createMarketBuyOrder('EURUSD', 0.01, 1.0850, 1.0800);
```

### 3. Self-Hosted Bridge (Python)

For more control, run your own bridge using the MetaTrader5 Python package.

**Requirements:**
- Windows VPS (Azure, AWS, or DigitalOcean Windows Droplet)
- MT5 Terminal installed and logged in
- Python 3.7+ with MetaTrader5 package
- FastAPI or Flask for REST API

**Example Bridge Server:**
```python
# bridge_server.py
import MetaTrader5 as mt5
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class TradeRequest(BaseModel):
    symbol: str
    action: str  # BUY or SELL
    lot_size: float
    stop_loss: float = None
    take_profit: float = None

@app.on_event("startup")
def startup():
    if not mt5.initialize():
        raise Exception("MT5 initialization failed")
    print("MT5 connected:", mt5.terminal_info())

@app.get("/account")
def get_account():
    info = mt5.account_info()
    return {
        "balance": info.balance,
        "equity": info.equity,
        "margin": info.margin,
        "free_margin": info.margin_free
    }

@app.get("/positions")
def get_positions():
    positions = mt5.positions_get()
    return [
        {
            "ticket": p.ticket,
            "symbol": p.symbol,
            "type": "BUY" if p.type == 0 else "SELL",
            "volume": p.volume,
            "profit": p.profit,
            "price_open": p.price_open,
            "sl": p.sl,
            "tp": p.tp
        }
        for p in positions
    ] if positions else []

@app.post("/trade")
def execute_trade(trade: TradeRequest):
    symbol = trade.symbol
    lot = trade.lot_size
    
    # Get current price
    tick = mt5.symbol_info_tick(symbol)
    if not tick:
        return {"error": f"Symbol {symbol} not found"}
    
    price = tick.ask if trade.action == "BUY" else tick.bid
    
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": lot,
        "type": mt5.ORDER_TYPE_BUY if trade.action == "BUY" else mt5.ORDER_TYPE_SELL,
        "price": price,
        "deviation": 20,
        "magic": 234000,
        "comment": "Web API trade",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    
    if trade.stop_loss:
        request["sl"] = trade.stop_loss
    if trade.take_profit:
        request["tp"] = trade.take_profit
    
    result = mt5.order_send(request)
    
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return {"error": f"Trade failed: {result.comment}"}
    
    return {
        "success": True,
        "ticket": result.order,
        "price": result.price,
        "volume": result.volume
    }
```

### 4. Connecting to Lovable

The edge function `execute-trade` should call your bridge server:

```typescript
// supabase/functions/execute-trade/index.ts
const MT5_BRIDGE_URL = Deno.env.get("MT5_BRIDGE_URL"); // e.g., https://your-vps:8000

// Execute trade via bridge
const response = await fetch(`${MT5_BRIDGE_URL}/trade`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    symbol: "EURUSD",
    action: "BUY",
    lot_size: 0.01,
    stop_loss: 1.0850,
    take_profit: 1.0950
  })
});

const result = await response.json();
```

## Cost Estimates

| Solution | Monthly Cost | Pros | Cons |
|----------|-------------|------|------|
| MetaApi.cloud | $10-50 | Managed, reliable, easy setup | Recurring cost |
| Windows VPS + Self-hosted | $15-30 | Full control, no API limits | More maintenance |
| Demo Account Only | Free | Good for testing | Not for live trading |

## Security Considerations

1. **Never expose MT5 credentials in frontend code**
2. **Use HTTPS for all API communications**
3. **Implement IP whitelisting on your bridge server**
4. **Store credentials in Supabase secrets, not in code**
5. **Use authentication tokens for API access**
6. **Monitor for suspicious trading activity**

## Next Steps

1. **Development/Testing**: Use MT5 demo accounts
2. **MetaApi Trial**: Start with their free tier
3. **Production**: Either MetaApi paid plan or self-hosted VPS

## Environment Variables Needed

Add these to your Supabase secrets:

```
MT5_BRIDGE_URL=https://your-bridge-server.com
MT5_BRIDGE_API_KEY=your-api-key
```

Or for MetaApi:

```
METAAPI_TOKEN=your-metaapi-token
METAAPI_ACCOUNT_ID=your-account-id
```
