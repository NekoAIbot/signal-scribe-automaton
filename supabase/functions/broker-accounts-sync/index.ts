// Broker accounts — refresh live balances/status for the user's linked accounts through the SDK.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getBrokerAccountInfo, BrokerError, type BrokerCredentials } from "../_shared/broker-sdk/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await service.auth.getUser(token);
    if (authErr || !user) return json({ ok: false, error_code: "AUTH_FAILED", message: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const credentialId = body.credentialId ? String(body.credentialId) : null;
    const broker = body.broker ? String(body.broker).toLowerCase() : null;

    let query = service.from("broker_credentials").select("*").eq("user_id", user.id).eq("is_active", true);
    if (credentialId) query = query.eq("id", credentialId);
    if (broker) query = query.eq("broker_type", broker);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const now = new Date().toISOString();
    const accounts: Array<Record<string, unknown>> = [];

    for (const row of rows || []) {
      try {
        const { info, permissions } = await getBrokerAccountInfo(row as BrokerCredentials);
        const landing = (info.raw as any)?.landing_company || row.landing_company || null;
        await service.from("broker_credentials").update({
          balance: Number(info.balance || 0),
          currency: info.currency || row.currency,
          landing_company: landing,
          last_synced_at: now,
          metadata: {
            ...((row.metadata as Record<string, unknown>) || {}),
            permissions,
            last_test: {
              ok: true,
              message: `Connected — ${Number(info.balance || 0).toFixed(2)} ${info.currency}`,
              missing_scopes: permissions?.missing || [],
              tested_at: now,
            },
          },
        }).eq("id", row.id);

        accounts.push({
          id: row.id, ok: true, account_id: info.accountId, balance: Number(info.balance || 0),
          currency: info.currency, environment: info.environment, landing_company: landing,
          trading_permitted: info.tradingPermitted,
        });
      } catch (e) {
        const err = e as BrokerError;
        accounts.push({ id: row.id, ok: false, message: err.message, error_code: err.code });
      }
    }

    return json({ ok: true, synced: accounts.filter(a => a.ok).length, accounts });
  } catch (error) {
    console.error("broker-accounts-sync failed:", error);
    return json({ ok: false, message: (error as Error)?.message || String(error) }, 400);
  }
});
