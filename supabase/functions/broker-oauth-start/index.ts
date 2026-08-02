// Broker OAuth — step 1: create a signed state and return the broker authorize URL.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import {
  buildAuthorizeUrl,
  getOAuthProvider,
  describeBroker,
  BrokerError,
  recoveryAction,
} from "../_shared/broker-sdk/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorBody(error: unknown) {
  const err = error instanceof BrokerError
    ? error
    : new BrokerError({ broker: "unknown", code: "UNKNOWN", message: (error as Error)?.message || String(error) });
  return {
    ok: false,
    error_code: err.code,
    message: err.message,
    hint: err.hint ?? null,
    recovery: recoveryAction(err.code),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await service.auth.getUser(token);
    if (authErr || !user) return json({ ok: false, error_code: "AUTH_FAILED", message: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const broker = String(body.broker || "deriv").toLowerCase();
    const redirectUri = String(body.redirectUri || "");
    const environment = body.environment ? String(body.environment) : null;
    const accountName = body.accountName ? String(body.accountName) : null;
    const returnTo = body.returnTo ? String(body.returnTo) : null;

    const provider = getOAuthProvider(broker);
    if (!provider) {
      throw new BrokerError({
        broker, code: "NOT_SUPPORTED",
        message: `${describeBroker(broker)?.displayName || broker} does not support OAuth.`,
        hint: "Use the API key connection method for this broker.",
      });
    }

    let parsed: URL;
    try { parsed = new URL(redirectUri); } catch {
      throw new BrokerError({ broker, code: "INVALID_REDIRECT_URI", message: "A valid callback URL is required." });
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      throw new BrokerError({ broker, code: "INVALID_REDIRECT_URI", message: "The callback URL must be http or https." });
    }

    const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

    const { error: stateErr } = await service.from("broker_oauth_states").insert({
      state,
      user_id: user.id,
      broker_type: broker,
      environment,
      account_name: accountName,
      redirect_uri: parsed.toString(),
      return_to: returnTo,
    });
    if (stateErr) throw new Error(stateErr.message);

    const authorizeUrl = buildAuthorizeUrl(broker, parsed.toString(), state);

    return json({
      ok: true,
      broker,
      state,
      authorize_url: authorizeUrl,
      scopes: provider.scopes,
      expires_in_seconds: 900,
    });
  } catch (error) {
    console.error("broker-oauth-start failed:", error);
    const payload = errorBody(error);
    return json(payload, payload.error_code === "CONFIG_MISSING" ? 400 : 400);
  }
});
