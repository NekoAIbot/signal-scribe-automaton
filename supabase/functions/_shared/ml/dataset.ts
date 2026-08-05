// Axion AI — dataset assembly from real market history and verified outcomes.
// Rule: only authentic data. No synthetic rows are ever generated to pad a
// dataset; if there is not enough real history, training is refused.

import { buildFeatureRow } from './core.ts';
import type { Dataset } from './learners.ts';

export const MIN_ROWS = 120;

export interface SymbolSeries { symbol: string; closes: number[] }

/** Pull real close series from the project's market-data function. */
export async function fetchHistory(
  supabaseUrl: string,
  anonKey: string,
  symbols: string[],
): Promise<SymbolSeries[]> {
  const res = await fetch(`${supabaseUrl}/functions/v1/fetch-market-quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({ symbols: symbols.join(','), candles: true }),
  });
  if (!res.ok) throw new Error(`Market history unavailable (${res.status})`);
  const body = await res.json();
  const map = body.candles || {};
  return symbols
    .map((symbol) => ({ symbol, closes: (map[symbol] || map[symbol.replace('/', '')] || []) as number[] }))
    .filter((s) => Array.isArray(s.closes) && s.closes.length >= 90);
}

/**
 * Supervised rows: features at bar t, label = did price close higher `horizon`
 * bars later by more than the round-trip cost estimate.
 */
export function buildDataset(series: SymbolSeries[], horizon = 5, costPct = 0.0004): Dataset {
  const X: number[][] = [];
  const y: number[] = [];
  const r: number[] = [];

  for (const s of series) {
    const closes = s.closes.filter((c) => Number.isFinite(c) && c > 0);
    for (let t = 60; t < closes.length - horizon; t++) {
      const row = buildFeatureRow(closes.slice(0, t + 1));
      if (!row) continue;
      const now = closes[t];
      const future = closes[t + horizon];
      const fwd = (future - now) / now;
      X.push(row);
      y.push(fwd > costPct ? 1 : 0);
      r.push(fwd);
    }
  }

  return { X, y, r };
}

/**
 * Verified execution outcomes recorded by the platform. These are appended as
 * real labelled observations when the originating features were persisted.
 */
export function datasetFromTradeOutcomes(trades: Array<Record<string, any>>): Dataset {
  const X: number[][] = [];
  const y: number[] = [];
  const r: number[] = [];

  for (const trade of trades) {
    const features = trade?.execution_timeline?.features || trade?.features;
    if (!Array.isArray(features) || features.length === 0) continue;
    const profit = Number(trade.profit || 0);
    const entry = Number(trade.entry_price || 0);
    if (!entry) continue;
    const isBuy = String(trade.trade_type || '').toLowerCase() === 'buy';
    const realised = profit / Math.max(entry, 1e-9);
    X.push(features.map(Number));
    y.push(profit > 0 ? (isBuy ? 1 : 0) : isBuy ? 0 : 1);
    r.push(isBuy ? realised : -realised);
  }

  return { X, y, r };
}

export function mergeDatasets(a: Dataset, b: Dataset): Dataset {
  if (!b.X.length) return a;
  if (!a.X.length) return b;
  if (a.X[0].length !== b.X[0].length) return a;
  return { X: [...a.X, ...b.X], y: [...a.y, ...b.y], r: [...a.r, ...b.r] };
}
