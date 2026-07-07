import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OAUTH_CONFIG: Record<string, { authUrl: string; clientIdEnv: string; redirectEnv: string; scopes: string[] }> = {
  deriv: { authUrl: "https://oauth.deriv.com/oauth2/authorize", clientIdEnv: "DERIV_OAUTH_CLIENT_ID", redirectEnv: "DERIV_OAUTH_REDIRECT_URI", scopes: ["read", "trade", "account_manage"] },
  binance: { authUrl: "https://accounts.binance.com/oauth/authorize", clientIdEnv: "BINANCE_OAUTH_CLIENT_ID", redirectEnv: "BINANCE_OAUTH_REDIRECT_URI", scopes: ["user:read", "trade"] },
  bybit: { authUrl: "https://www.bybit.com/oauth/authorize", clientIdEnv: "BYBIT_OAUTH_CLIENT_ID", redirectEnv: "BYBIT_OAUTH_REDIRECT_URI", scopes: ["account:read", "trade"] },
  alpaca: { authUrl: "https://app.alpaca.markets/oauth/authorize", clientIdEnv: "ALPACA_OAUTH_CLIENT_ID", redirectEnv: "ALPACA_OAUTH_REDIRECT_URI", scopes: ["account:write", "trading"] },
  interactive_brokers: { authUrl: "https://oauth.ibkr.com/oauth2/authorize", clientIdEnv: "IBKR_OAUTH_CLIENT_ID", redirectEnv: "IBKR_OAUTH_REDIRECT_URI", scopes: ["accounts", "trading"] },
  oanda: { authUrl: "https://www.oanda.com/oauth/authorize", clientIdEnv: "OANDA_OAUTH_CLIENT_ID", redirectEnv: "OANDA_OAUTH_REDIRECT_URI", scopes: ["read", "trade"] },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Not authenticated");

    const { broker, environment } = await req.json();
    const config = OAUTH_CONFIG[String(broker || "")];
    if (!config) return json({ ok: false, error: "OAuth is not configured for this broker. Use the official fallback method." }, 400);

    const clientId = Deno.env.get(config.clientIdEnv);
    const redirectUri = Deno.env.get(config.redirectEnv);
    if (!clientId || !redirectUri) {
      return json({ ok: false, error: `${broker} OAuth is not configured on the backend yet. Set ${config.clientIdEnv} and ${config.redirectEnv}.` }, 200);
    }

    const state = crypto.randomUUID();
    const url = new URL(config.authUrl);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "consent");

    return json({ ok: true, authorizationUrl: url.toString(), state, broker, environment });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "OAuth start failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
