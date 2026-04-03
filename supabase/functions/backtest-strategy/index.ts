import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const params = await req.json();
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: trades, error: tradesError } = await supabaseClient
      .from('trades')
      .select('symbol, trade_type, entry_price, close_price, profit, open_time, close_time, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .in('symbol', params.symbols || [])
      .order('created_at', { ascending: true });

    if (tradesError) throw tradesError;

    const tradesData = (trades || []).map(trade => ({
      symbol: trade.symbol,
      type: trade.trade_type,
      entry_price: Number(trade.entry_price || 0),
      exit_price: Number(trade.close_price || trade.entry_price || 0),
      profit: Number(trade.profit || 0),
      entry_time: trade.open_time || trade.created_at,
      exit_time: trade.close_time || trade.created_at,
    }));

    const totalTrades = tradesData.length;
    const profits = tradesData.filter(t => t.profit > 0).map(t => t.profit);
    const losses = tradesData.filter(t => t.profit <= 0).map(t => t.profit);

    const winRate = totalTrades > 0 ? profits.length / totalTrades : 0;
    const netProfit = tradesData.reduce((sum, trade) => sum + trade.profit, 0);
    const profitFactor = profits.length > 0 && losses.length > 0
      ? Math.abs(profits.reduce((sum, p) => sum + p, 0) / losses.reduce((sum, l) => sum + l, 0))
      : 0;

    const result = {
      id: `backtest-${Date.now()}`,
      strategyId: params.strategyId,
      startDate: params.startDate,
      endDate: params.endDate,
      totalTrades,
      winRate,
      profitFactor,
      sharpeRatio: 0,
      maxDrawdown: 0,
      netProfit,
      symbols: params.symbols,
      tradesData,
      source: 'real-trades',
    };

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error backtesting strategy:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
