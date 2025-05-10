
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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
    console.log('Backtesting strategy with parameters:', JSON.stringify(params));
    
    // In a real implementation, this would run simulations on historical data
    // For development purposes, simulate backtesting
    
    // Get the strategy details
    const { data: strategy, error: strategyError } = await supabaseClient
      .from('trading_strategies')
      .select('*')
      .eq('id', params.strategyId)
      .single();
    
    if (strategyError) {
      console.warn('Strategy not found, using default values');
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock trade data
    const tradesData = [];
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    const dayDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const totalTrades = 20 + Math.floor(Math.random() * 30); // 20-50 trades
    
    for (let i = 0; i < totalTrades; i++) {
      // Random date within range
      const tradeDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
      
      // Random symbol from the symbols list
      const symbol = params.symbols[Math.floor(Math.random() * params.symbols.length)];
      
      // Random price
      const price = symbol.includes('JPY') ? 
        100 + Math.random() * 50 : // JPY pairs
        1 + Math.random() * 2; // Other pairs
      
      // Random type
      const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
      
      // Random profit/loss (-2% to +3%)
      const profitPct = (Math.random() * 5) - 2;
      const profit = (params.initialCapital / totalTrades) * (profitPct / 100);
      
      tradesData.push({
        symbol,
        type,
        entry_price: price,
        exit_price: price * (1 + (type === 'BUY' ? profitPct : -profitPct) / 100),
        profit,
        entry_time: tradeDate.toISOString(),
        exit_time: new Date(tradeDate.getTime() + 1000 * 60 * 60 * (4 + Math.random() * 20)).toISOString()
      });
    }
    
    // Calculate overall statistics
    const profits = tradesData.filter(t => t.profit > 0).map(t => t.profit);
    const losses = tradesData.filter(t => t.profit <= 0).map(t => t.profit);
    
    const winRate = profits.length / totalTrades;
    const netProfit = tradesData.reduce((sum, trade) => sum + trade.profit, 0);
    const profitFactor = profits.length > 0 && losses.length > 0 ? 
      Math.abs(profits.reduce((sum, p) => sum + p, 0) / losses.reduce((sum, l) => sum + l, 0)) : 
      1.0;
    
    // Create result
    const result = {
      id: `backtest-${Date.now()}`,
      strategyId: params.strategyId,
      startDate: params.startDate,
      endDate: params.endDate,
      totalTrades,
      winRate,
      profitFactor,
      sharpeRatio: 1.2 + Math.random() * 0.8,
      maxDrawdown: 3 + Math.random() * 7,
      netProfit,
      symbols: params.symbols,
      tradesData
    };
    
    // Store backtest result
    const { data: backtest, error: backtestError } = await supabaseClient
      .from('backtest_results')
      .insert(result)
      .select();
    
    if (backtestError) {
      console.warn('Failed to store backtest result:', backtestError);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        result: backtest?.[0] || result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error backtesting strategy:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
