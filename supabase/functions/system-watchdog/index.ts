// Axion AI — System Watchdog.
// Conservative by design: it checks, it recovers, and it only alerts when
// recovery fails. It never fires on a single transient blip.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { checkBrokerHealth } from "../_shared/broker-sdk/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SIGNAL_STALE_MINUTES = 45;

interface CheckResult {
  component: string;
  healthy: boolean;
  status: string;
  message: string;
  recovery_attempted: boolean;
  recovery_succeeded: boolean | null;
  details: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: CheckResult[] = [];
  const alerts: string[] = [];

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const onlyUser = body.userId ? String(body.userId) : null;

    const { data: settings } = await service
      .from("trading_bot_settings")
      .select("user_id, bot_enabled, telegram_enabled")
      .eq("bot_enabled", true);

    const users = (settings || []).filter((s) => !onlyUser || s.user_id === onlyUser);

    for (const setting of users) {
      const userId = setting.user_id as string;

      // ---- 1. Broker connection health (with one recovery re-test) ----
      const { data: creds } = await service
        .from("broker_credentials")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (!creds?.length) {
        results.push({
          component: "broker_connection",
          healthy: false,
          status: "no_active_account",
          message: "No active broker account — automatic execution is paused.",
          recovery_attempted: false,
          recovery_succeeded: null,
          details: { user_id: userId },
        });
        alerts.push("No active broker account is connected.");
      }

      for (const cred of creds || []) {
        let ok = false;
        let detail = "";
        let recovered: boolean | null = null;
        try {
          const health = await checkBrokerHealth(cred as never);
          ok = !!health.connected;
          detail = health.message || "";
        } catch (error) {
          detail = (error as Error)?.message || String(error);
        }

        if (!ok) {
          // Recovery: one retry before we consider it a real outage.
          await new Promise((r) => setTimeout(r, 1500));
          try {
            const retry = await checkBrokerHealth(cred as never);
            recovered = !!retry.connected;
            if (recovered) detail = `Recovered on retry. ${retry.message || ""}`;
          } catch (error) {
            recovered = false;
            detail = (error as Error)?.message || String(error);
          }
          if (recovered === false) {
            alerts.push(`${cred.broker_type} account ${cred.account_id || cred.login} is unreachable: ${detail}`);
          }
        }

        results.push({
          component: "broker_connection",
          healthy: ok || recovered === true,
          status: ok ? "connected" : recovered ? "recovered" : "unreachable",
          message: detail || "Broker session is valid.",
          recovery_attempted: !ok,
          recovery_succeeded: recovered,
          details: { user_id: userId, broker: cred.broker_type, account_id: cred.account_id },
        });
      }

      // ---- 2. Signal engine freshness (recovery = kick the bot runner) ----
      const since = new Date(Date.now() - SIGNAL_STALE_MINUTES * 60_000).toISOString();
      const { count: recentSignals } = await service
        .from("trading_signals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", since);

      const fresh = (recentSignals || 0) > 0;
      let signalRecovered: boolean | null = null;

      if (!fresh) {
        try {
          const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/run-trading-bot`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ userId, source: "watchdog" }),
          });
          signalRecovered = res.ok;
          if (!res.ok) alerts.push("The signal engine is stale and could not be restarted automatically.");
        } catch (error) {
          signalRecovered = false;
          alerts.push(`Signal engine restart failed: ${(error as Error)?.message}`);
        }
      }

      results.push({
        component: "signal_engine",
        healthy: fresh || signalRecovered === true,
        status: fresh ? "active" : signalRecovered ? "restarted" : "stalled",
        message: fresh
          ? `${recentSignals} signal(s) evaluated in the last ${SIGNAL_STALE_MINUTES} minutes.`
          : signalRecovered
            ? "Signal engine was idle and has been restarted."
            : "Signal engine is stalled and did not restart.",
        recovery_attempted: !fresh,
        recovery_succeeded: signalRecovered,
        details: { user_id: userId, window_minutes: SIGNAL_STALE_MINUTES },
      });

      // ---- 3. Telegram delivery configuration ----
      if (setting.telegram_enabled) {
        const configured = !!Deno.env.get("TELEGRAM_BOT_TOKEN") && !!Deno.env.get("TELEGRAM_CHAT_ID");
        if (!configured) alerts.push("Telegram delivery is enabled but the bot is not configured.");
        results.push({
          component: "telegram",
          healthy: configured,
          status: configured ? "configured" : "misconfigured",
          message: configured ? "Telegram bot credentials present." : "Telegram bot token or chat id is missing.",
          recovery_attempted: false,
          recovery_succeeded: null,
          details: { user_id: userId },
        });
      }

      // Persist the trail (alert flag only where recovery genuinely failed).
      const rows = results
        .filter((r) => (r.details as { user_id?: string }).user_id === userId)
        .map((r) => ({
          user_id: userId,
          component: r.component,
          status: r.status,
          healthy: r.healthy,
          recovery_attempted: r.recovery_attempted,
          recovery_succeeded: r.recovery_succeeded,
          alerted: !r.healthy && r.recovery_succeeded === false,
          message: r.message,
          details: r.details,
        }));
      if (rows.length) await service.from("system_health_events").insert(rows);

      // Controlled alerting: one consolidated message, only on failed recovery.
      const failed = rows.filter((r) => r.alerted);
      if (failed.length && setting.telegram_enabled) {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            type: "telegram",
            message: `🛑 Axion watchdog: automatic recovery failed.\n\n${failed.map((f) => `• ${f.component}: ${f.message}`).join("\n")}`,
          }),
        }).catch(() => undefined);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        checked_users: users.length,
        healthy: results.every((r) => r.healthy),
        results,
        alerts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("system-watchdog failed:", error);
    return new Response(
      JSON.stringify({ ok: false, message: (error as Error)?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
