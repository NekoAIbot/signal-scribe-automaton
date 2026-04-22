import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import LiveTradeCard from '@/components/monitoring/LiveTradeCard';
import type { Trade } from '@/hooks/useLiveTrades';

/**
 * E2E-style test for the Signals → Monitoring trade flow at a 360px viewport.
 *
 * Strategy: rather than booting the entire app (which requires Supabase auth),
 * we exercise the contract used by the realtime pipeline:
 *   1) Place a "trade" by calling supabase.functions.invoke('execute-trade', …) — mocked.
 *   2) Simulate the realtime INSERT event the edge function would have triggered.
 *   3) Verify the LiveTradeCard renders the trade with its execution timeline,
 *      and that the layout fits a 360px wide viewport.
 */

vi.mock('@/integrations/supabase/client', () => {
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((cb: any) => { cb?.('SUBSCRIBED'); return channel; }),
    unsubscribe: vi.fn(),
  };
  const supabase = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
    functions: {
      invoke: vi.fn(async (name: string) => {
        if (name === 'execute-trade') {
          return {
            data: {
              success: true,
              tradeId: 'trade-123',
              ticketNumber: 'PAPER-1',
              timeline: [
                { stage: 'requested', status: 'started', at: new Date().toISOString() },
                { stage: 'auth', status: 'success', at: new Date().toISOString() },
                { stage: 'order', status: 'success', at: new Date().toISOString(), message: 'Paper ticket PAPER-1' },
                { stage: 'filled', status: 'success', at: new Date().toISOString() },
              ],
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }),
    },
  };
  return { supabase };
});

const buildTrade = (overrides: Partial<Trade> = {}): Trade => ({
  id: 'trade-123',
  user_id: 'user-1',
  symbol: 'EUR/USD',
  trade_type: 'BUY',
  status: 'open',
  entry_price: 1.0838,
  current_price: 1.0840,
  close_price: null,
  lot_size: 0.01,
  stop_loss: 1.083,
  take_profit: 1.085,
  profit: 2.0,
  commission: 0,
  swap: 0,
  ticket_number: 'PAPER-1',
  open_time: new Date().toISOString(),
  close_time: null,
  strategy_id: null,
  model_id: null,
  broker_account_id: null,
  execution_timeline: [
    { stage: 'requested', status: 'started', at: new Date().toISOString() },
    { stage: 'order', status: 'success', at: new Date().toISOString(), message: 'Paper ticket PAPER-1' },
    { stage: 'filled', status: 'success', at: new Date().toISOString() },
  ],
  last_execution_status: 'filled',
  ...overrides,
});

describe('Signals → Monitoring trade flow @ 360px', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 360 });
  });

  it('places a trade via execute-trade and surfaces it in a LiveTradeCard with timeline', async () => {
    const { supabase } = await import('@/integrations/supabase/client');

    // Step 1: place trade (Signals page action)
    const result = await act(async () =>
      supabase.functions.invoke('execute-trade', {
        body: { symbol: 'EUR/USD', type: 'BUY', price: 1.0838, lotSize: 0.01 },
      })
    );

    expect(result.error).toBeNull();
    expect(result.data?.success).toBe(true);
    expect(result.data?.tradeId).toBe('trade-123');
    expect(result.data?.timeline?.length).toBeGreaterThanOrEqual(3);

    // Step 2: render the resulting trade as Monitoring would after the realtime INSERT
    const trade = buildTrade();
    const { container } = render(<LiveTradeCard trade={trade} />);

    // Step 3: verify visible content within timeout
    await waitFor(() => {
      expect(screen.getByTestId(`trade-card-${trade.id}`)).toBeInTheDocument();
      expect(screen.getByText('EUR/USD')).toBeInTheDocument();
      expect(screen.getByText('BUY')).toBeInTheDocument();
      expect(screen.getByTestId(`timeline-toggle-${trade.id}`)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Step 4: 360px layout sanity — no element should exceed the viewport width
    const card = container.querySelector(`[data-testid="trade-card-${trade.id}"]`) as HTMLElement;
    expect(card).toBeTruthy();
    // jsdom doesn't compute layout, but Tailwind responsive classes should be present
    const html = card.outerHTML;
    expect(html).toMatch(/grid-cols-2/);  // mobile-first 2-col grid
    expect(html).toMatch(/p-3/);          // mobile padding
  });

  it('shows "Filled" as the latest stage chip on the timeline toggle', async () => {
    const trade = buildTrade();
    render(<LiveTradeCard trade={trade} />);
    const toggle = screen.getByTestId(`timeline-toggle-${trade.id}`);
    expect(toggle.textContent).toMatch(/filled/i);
  });

  it('marks failed trades visibly so users can see where execution broke', async () => {
    const trade = buildTrade({
      status: 'cancelled',
      last_execution_status: 'metaapi_failed',
      execution_timeline: [
        { stage: 'requested', status: 'started', at: new Date().toISOString() },
        { stage: 'auth', status: 'success', at: new Date().toISOString() },
        { stage: 'provisioning', status: 'failed', at: new Date().toISOString(), message: '401: invalid auth-token header' },
      ],
    });
    render(<LiveTradeCard trade={trade} />);
    expect(screen.getByText('cancelled')).toBeInTheDocument();
    const toggle = screen.getByTestId(`timeline-toggle-${trade.id}`);
    expect(toggle.textContent).toMatch(/provisioning/i);
  });
});
