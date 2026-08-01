// Universal Broker SDK — symbol normalization across brokers.

export type AssetClass = 'forex' | 'crypto' | 'metals' | 'indices' | 'commodities' | 'stocks' | 'synthetic' | 'unknown';

const METALS = ['XAU', 'XAG', 'XPT', 'XPD'];
const FIAT = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF', 'SEK', 'NOK', 'ZAR', 'SGD', 'HKD', 'MXN', 'TRY'];
const INDEX_HINTS = ['US30', 'US500', 'NAS100', 'SPX', 'NDX', 'DJI', 'GER40', 'DAX', 'UK100', 'JP225', 'HK50', 'AUS200'];
const COMMODITIES = ['USOIL', 'UKOIL', 'WTI', 'BRENT', 'NGAS', 'XNG'];
const CRYPTO_BASES = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE', 'BNB', 'LTC', 'DOT', 'AVAX', 'MATIC', 'LINK', 'TRX', 'TON'];

export function compact(symbol: string): string {
  return String(symbol || '').replace(/[\s\-_/]/g, '').toUpperCase();
}

export function classifySymbol(symbol: string): AssetClass {
  const s = compact(symbol);
  if (!s) return 'unknown';
  if (INDEX_HINTS.some(i => s.startsWith(i))) return 'indices';
  if (COMMODITIES.some(c => s.startsWith(c))) return 'commodities';
  if (METALS.some(m => s.startsWith(m))) return 'metals';
  if (CRYPTO_BASES.some(c => s.startsWith(c))) return 'crypto';
  if (/^R_\d+|^BOOM|^CRASH|^STEP|VOLATILITY/.test(s)) return 'synthetic';
  if (/^[A-Z]{6}$/.test(s) && FIAT.includes(s.slice(0, 3)) && FIAT.includes(s.slice(3))) return 'forex';
  if (/^[A-Z]{1,5}$/.test(s)) return 'stocks';
  return 'unknown';
}

/** Canonical internal representation, e.g. EUR/USD, BTC/USDT, XAU/USD. */
export function normalizeSymbol(symbol: string): string {
  const s = compact(symbol);
  if (s.length === 6 && (classifySymbol(s) === 'forex' || METALS.includes(s.slice(0, 3)))) {
    return `${s.slice(0, 3)}/${s.slice(3)}`;
  }
  for (const quote of ['USDT', 'USDC', 'BUSD', 'FDUSD']) {
    if (s.endsWith(quote) && s.length > quote.length) return `${s.slice(0, -quote.length)}/${quote}`;
  }
  if (s.endsWith('USD') && s.length > 3 && classifySymbol(s) === 'crypto') return `${s.slice(0, -3)}/USD`;
  return s;
}

/** Binance Spot native symbol (no separator, USDT quote preferred). */
export function toBinanceSymbol(symbol: string): string {
  const s = compact(symbol);
  const cls = classifySymbol(s);
  if (cls !== 'crypto') {
    throw new Error(`Symbol ${symbol} (${cls}) is not tradable on Binance Spot. Use a crypto pair such as BTC/USDT.`);
  }
  if (/(USDT|BUSD|USDC|BTC|ETH|BNB|FDUSD|TUSD|DAI)$/.test(s)) return s;
  if (s.endsWith('USD')) return `${s.slice(0, -3)}USDT`;
  return s;
}

/** OANDA native instrument, e.g. EUR_USD, XAU_USD. */
export function toOandaSymbol(symbol: string): string {
  const s = compact(symbol);
  if (s.length === 6) return `${s.slice(0, 3)}_${s.slice(3)}`;
  const norm = normalizeSymbol(s);
  return norm.includes('/') ? norm.replace('/', '_') : s;
}

/** Deriv native symbol, e.g. frxEURUSD, frxXAUUSD, cryBTCUSD. */
export function toDerivSymbol(symbol: string): string {
  const s = compact(symbol);
  const cls = classifySymbol(s);
  if (cls === 'synthetic') return s;
  if (cls === 'crypto') return `cry${s.endsWith('USDT') ? `${s.slice(0, -4)}USD` : s}`;
  if (s.length === 6 && (cls === 'forex' || cls === 'metals')) return `frx${s}`;
  return s;
}

/** Capital.com epic. */
export function toCapitalSymbol(symbol: string): string {
  return compact(symbol);
}
