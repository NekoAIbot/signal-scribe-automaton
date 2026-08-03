// Broker OAuth — step 1: create a signed state (+PKCE challenge) and return the
// broker authorize URL. Every lifecycle step is logged to broker_oauth_events.
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

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let userId: string | null = null;
  let brokerType = "deriv";
  let stateValue: string | null = null;

  const log = async (step: string, status: string, message: string, details: Record<string, unknown> = {}) => {
    console.log(JSON.stringify({ fn: "broker-oauth-start", step, status, message, at: new Date().toISOString(), ...details }));
    if (!userId) return;
    await service.from("broker_oauth_events").insert({
      user_id: userId, broker_type: brokerType, state: stateValue, step, status, message, details,
    });
  };

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await service.auth.getUser(token);
    if (authErr || !user) return json({ ok: false, error_code: "AUTH_FAILED", message: "Unauthorized" }, 401);
    userId = user.id;

    const body = await req.json().catch(() => ({}));
    brokerType = String(body.broker || "deriv").toLowerCase();
    const redirectUri = String(body.redirectUri || "");
    const environment = body.environment ? String(body.environment) : null;
    const accountName = body.accountName ? String(body.accountName) : null;
    const returnTo = body.returnTo ? String(body.returnTo) : null;
    const codeChallenge = body.codeChallenge ? String(body.codeChallenge) : null;
    const codeChallengeMethod = String(body.codeChallengeMethod || "S256");

    await log("connect_clicked", "info", `Connect ${brokerType} requested`, { environment });

    const provider = getOAuthProvider(brokerType);
    if (!provider) {
      throw new BrokerError({
        broker: brokerType, code: "NOT_SUPPORTED",
        message: `${describeBroker(brokerType)?.displayName || brokerType} does not support OAuth.`,
        hint: "Use the API key connection method for this broker.",
      });
    }

    let parsed: URL;
    try { parsed = new URL(redirectUri); } catch {
      throw new BrokerError({ broker: brokerType, code: "INVALID_REDIRECT_URI", message: "A valid callback URL is required." });
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      throw new BrokerError({ broker: brokerType, code: "INVALID_REDIRECT_URI", message: "The callback URL must be http or https." });
    }

    stateValue = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

    const { error: stateErr } = await service.from("broker_oauth_states").insert({
      state: stateValue,
      user_id: user.id,
      broker_type: brokerType,
      environment,
      account_name: accountName,
      redirect_uri: parsed.toString(),
      return_to: returnTo,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallenge ? codeChallengeMethod : null,
    });
    if (stateErr) throw new Error(stateErr.message);

    const authorizeUrl = buildAuthorizeUrl(brokerType, parsed.toString(), stateValue);

    await log("authorize_url_generated", "success", "Authorization URL generated", {
      redirect_uri: parsed.toString(), pkce: !!codeChallenge, scopes: provider.scopes,
    });

    return json({
      ok: true,
      broker: brokerType,
      state: stateValue,
      authorize_url: authorizeUrl,
      scopes: provider.scopes,
      expires_in_seconds: 900,
    });
  } catch (error) {
    console.error("broker-oauth-start failed:", error);
    const payload = errorBody(error);
    await log("authorize_url_failed", "error", String(payload.message), { error_code: payload.error_code });
    return json(payload, 400);
  }
});
