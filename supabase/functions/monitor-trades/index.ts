// Axion AI — live trade monitor.
// Runs every minute: re-prices every open trade against real market quotes,
// updates unrealised P&L, moves the stop to breakeven at 1R, trails it at 1.5R,
// and closes the trade the moment price touches stop-loss or take-profit.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const nowIso = () => new Date().toISOString();
const num = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const key = (s: string) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { data: open, error } = await service
      .from("trades")
      .select("id, user_id, symbol, trade_type, entry_price, current_price, lot_size, stop_loss, take_profit, open_time, execution_timeline")
      .eq("status", "open")
      .limit(500);
    if (error) throw new Error(error.message);

    if (!open || open.length === 0) {
      return json({ ok: true, monitored: 0, closed: 0, adjusted: 0, message: "No open trades" });
    }

    const symbols = Array.from(new Set(open.map((t) => t.symbol).filter(Boolean)));
    const res = await fetch(`${supabaseUrl}/functions/v1/fetch-market-quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ symbols: symbols.join(","), candles: false }),
    });
    const quoteData = await res.json().catch(() => ({}));
    const quotes: Record<string, any> = {};
    for (const [k, v] of Object.entries(quoteData?.quotes || {})) quotes[key(k)] = v;

    let closed = 0, adjusted = 0, priced = 0;

    for (const trade of open) {
      const quote = quotes[key(trade.symbol)];
      if (!quote) continue;

      const bid = num(quote.bid, num(quote.price));
      const ask = num(quote.ask, num(quote.price));
      const isBuy = String(trade.trade_type).toUpperCase() === "BUY";
      // Exit at the price the broker would actually fill on.
      const price = isBuy ? bid || ask : ask || bid;
      if (!price) continue;
      priced += 1;

      const entry = num(trade.entry_price);
      const lots = num(trade.lot_size, 0.01);
      const direction = isBuy ? 1 : -1;
      const move = (price - entry) * direction;
      const profit = Number((move * lots * 10000).toFixed(2));

      let stopLoss = trade.stop_loss == null ? null : num(trade.stop_loss);
      const takeProfit = trade.take_profit == null ? null : num(trade.take_profit);

      // Exit checks first — a touched level closes the trade at that level.
      let exitReason: string | null = null;
      let exitPrice = price;
      if (stopLoss != null && ((isBuy && price <= stopLoss) || (!isBuy && price >= stopLoss))) {
        exitReason = "stop_loss";
        exitPrice = stopLoss;
      } else if (takeProfit != null && ((isBuy && price >= takeProfit) || (!isBuy && price <= takeProfit))) {
        exitReason = "take_profit";
        exitPrice = takeProfit;
      }

      const timeline = Array.isArray(trade.execution_timeline) ? trade.execution_timeline : [];

      if (exitReason) {
        const realised = Number(((exitPrice - entry) * direction * lots * 10000).toFixed(2));
        await service.from("trades").update({
          status: "closed",
          close_price: exitPrice,
          current_price: exitPrice,
          close_time: nowIso(),
          profit: realised,
          last_execution_status: exitReason,
          execution_timeline: [...timeline, { stage: "monitor_exit", status: "success", at: nowIso(), message: `Closed on ${exitReason} at ${exitPrice}` }],
          updated_at: nowIso(),
        }).eq("id", trade.id);
        closed += 1;
        continue;
      }

      // Dynamic protection: risk distance defines 1R.
      const risk = stopLoss != null ? Math.abs(entry - stopLoss) : 0;
      let stopChanged = false;
      if (risk > 0 && move >= risk) {
        const breakeven = entry;
        const trail = move >= risk * 1.5 ? price - direction * risk * 0.75 : breakeven;
        const better = isBuy ? Math.max(stopLoss!, trail) : Math.min(stopLoss!, trail);
        if (Math.abs(better - stopLoss!) > Number.EPSILON) {
          stopLoss = better;
          stopChanged = true;
        }
      }

      await service.from("trades").update({
        current_price: price,
        profit,
        ...(stopChanged ? { stop_loss: stopLoss } : {}),
        ...(stopChanged
          ? {
              execution_timeline: [...timeline, {
                stage: "stop_adjusted",
                status: "success",
                at: nowIso(),
                message: move >= risk * 1.5 ? `Trailing stop moved to ${stopLoss}` : `Stop moved to breakeven ${stopLoss}`,
              }],
            }
          : {}),
        updated_at: nowIso(),
      }).eq("id", trade.id);

      if (stopChanged) adjusted += 1;
    }

    return json({ ok: true, monitored: priced, open: open.length, closed, adjusted });
  } catch (e) {
    console.error("monitor-trades failed:", e);
    return json({ ok: false, message: (e as Error)?.message || String(e) }, 500);
  }
});
