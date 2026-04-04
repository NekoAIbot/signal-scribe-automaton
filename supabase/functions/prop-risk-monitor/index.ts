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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { accountId, accountBalance } = await req.json();

    // Get prop account credentials
    const { data: account } = await supabaseClient
      .from('broker_credentials')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get today's trades
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayTrades } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('broker_account_id', accountId)
      .gte('created_at', todayStart.toISOString());

    // Get all-time trades for total drawdown
    const { data: allTrades } = await supabaseClient
      .from('trades')
      .select('profit, created_at')
      .eq('user_id', user.id)
      .eq('broker_account_id', accountId)
      .order('created_at', { ascending: true });

    const trades = todayTrades || [];
    const balance = accountBalance || 100000;

    // Daily P&L
    const dailyPnL = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const dailyDrawdownPct = (dailyPnL / balance) * 100;
    const openPositions = trades.filter(t => t.status === 'open').length;
    const totalLotSize = trades.filter(t => t.status === 'open').reduce((sum, t) => sum + (t.lot_size || 0), 0);

    // Calculate total drawdown from equity curve
    let peak = balance;
    let maxDrawdown = 0;
    let runningBalance = balance;
    for (const t of (allTrades || [])) {
      runningBalance += (t.profit || 0);
      if (runningBalance > peak) peak = runningBalance;
      const dd = ((peak - runningBalance) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Risk limits (configurable per account type)
    const limits = {
      maxDailyDrawdownPct: 4.0,
      maxTotalDrawdownPct: 10.0,
      maxOpenPositions: 5,
      maxTotalLotSize: 1.0,
      warningThresholdPct: 0.75, // warn at 75% of limit
    };

    const dailyDrawdownUsed = Math.abs(dailyDrawdownPct);
    const totalDrawdownUsed = maxDrawdown;

    const warnings: string[] = [];
    let shouldPause = false;
    let severity: 'ok' | 'warning' | 'critical' | 'paused' = 'ok';

    // Daily drawdown check
    if (dailyDrawdownUsed >= limits.maxDailyDrawdownPct) {
      shouldPause = true;
      severity = 'paused';
      warnings.push(`CRITICAL: Daily drawdown ${dailyDrawdownUsed.toFixed(2)}% exceeds ${limits.maxDailyDrawdownPct}% limit. Trading PAUSED.`);
    } else if (dailyDrawdownUsed >= limits.maxDailyDrawdownPct * limits.warningThresholdPct) {
      severity = 'critical';
      warnings.push(`WARNING: Daily drawdown at ${dailyDrawdownUsed.toFixed(2)}%, approaching ${limits.maxDailyDrawdownPct}% limit.`);
    }

    // Total drawdown check
    if (totalDrawdownUsed >= limits.maxTotalDrawdownPct) {
      shouldPause = true;
      severity = 'paused';
      warnings.push(`CRITICAL: Total drawdown ${totalDrawdownUsed.toFixed(2)}% exceeds ${limits.maxTotalDrawdownPct}% limit. Trading PAUSED.`);
    } else if (totalDrawdownUsed >= limits.maxTotalDrawdownPct * limits.warningThresholdPct) {
      if (severity !== 'paused') severity = 'critical';
      warnings.push(`WARNING: Total drawdown at ${totalDrawdownUsed.toFixed(2)}%, approaching ${limits.maxTotalDrawdownPct}% limit.`);
    }

    // Position limits
    if (openPositions >= limits.maxOpenPositions) {
      if (severity === 'ok') severity = 'warning';
      warnings.push(`Max open positions reached: ${openPositions}/${limits.maxOpenPositions}`);
    }
    if (totalLotSize >= limits.maxTotalLotSize) {
      if (severity === 'ok') severity = 'warning';
      warnings.push(`Total lot size ${totalLotSize.toFixed(2)} at limit of ${limits.maxTotalLotSize}`);
    }

    // Send Telegram alert if critical
    if (severity === 'critical' || severity === 'paused') {
      const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
      const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const emoji = severity === 'paused' ? '🛑' : '⚠️';
        const msg = `${emoji} PROP RISK ALERT ${emoji}\n\nAccount: ${account.account_name}\nDaily DD: ${dailyDrawdownUsed.toFixed(2)}%\nTotal DD: ${totalDrawdownUsed.toFixed(2)}%\nOpen: ${openPositions}\n\n${warnings.join('\n')}\n\nStatus: ${shouldPause ? 'TRADING PAUSED' : 'WARNING'}`;
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg })
        });
      }
    }

    // Send email notification for warning/critical/paused via send-notification
    if (severity === 'warning' || severity === 'critical' || severity === 'paused') {
      try {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('email, name')
          .eq('id', user.id)
          .single();

        if (profile?.email) {
          const severityEmoji = severity === 'paused' ? '🛑' : severity === 'critical' ? '🔴' : '🟡';
          await supabaseAdmin.functions.invoke('send-notification', {
            body: {
              type: 'email',
              to: profile.email,
              subject: `${severityEmoji} Prop Risk Alert: ${severity.toUpperCase()} - ${account.account_name}`,
              body: `
<h2>${severityEmoji} Prop-Firm Risk Alert</h2>
<p><strong>Account:</strong> ${account.account_name}</p>
<p><strong>Status:</strong> ${severity.toUpperCase()}</p>
<p><strong>Daily Drawdown:</strong> ${dailyDrawdownUsed.toFixed(2)}% / ${limits.maxDailyDrawdownPct}%</p>
<p><strong>Total Drawdown:</strong> ${totalDrawdownUsed.toFixed(2)}% / ${limits.maxTotalDrawdownPct}%</p>
<p><strong>Open Positions:</strong> ${openPositions} / ${limits.maxOpenPositions}</p>
<p><strong>Daily P&L:</strong> $${dailyPnL.toFixed(2)}</p>
<hr/>
<ul>${warnings.map(w => `<li>${w}</li>`).join('')}</ul>
<p>${shouldPause ? '<strong style="color:red">Trading has been PAUSED automatically.</strong>' : 'Please monitor your account closely.'}</p>
              `.trim(),
            }
          });
        }
      } catch (emailErr) {
        console.error('Email notification error:', emailErr);
      }
    }

    return new Response(JSON.stringify({
      accountId,
      severity,
      shouldPause,
      warnings,
      metrics: {
        dailyPnL,
        dailyDrawdownPct: dailyDrawdownUsed,
        totalDrawdownPct: totalDrawdownUsed,
        openPositions,
        totalLotSize,
        currentBalance: runningBalance,
        peakBalance: peak,
      },
      limits,
      tradestoday: trades.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Prop risk monitor error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
