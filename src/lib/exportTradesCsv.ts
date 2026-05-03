import type { Trade } from '@/hooks/useLiveTrades';

const csvEscape = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const COLUMNS: Array<keyof Trade> = [
  'id', 'symbol', 'trade_type', 'status',
  'entry_price', 'current_price', 'close_price',
  'lot_size', 'stop_loss', 'take_profit',
  'profit', 'commission', 'swap',
  'ticket_number', 'open_time', 'close_time',
  'broker_account_id', 'strategy_id', 'model_id',
  'last_execution_status', 'execution_timeline',
];

export const tradesToCsv = (trades: Trade[]): string => {
  const header = COLUMNS.join(',');
  const rows = trades.map(t => COLUMNS.map(c => csvEscape((t as any)[c])).join(','));
  return [header, ...rows].join('\n');
};

export const downloadTradesCsv = (trades: Trade[], filename = `trades-${new Date().toISOString().slice(0,10)}.csv`) => {
  const csv = tradesToCsv(trades);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
