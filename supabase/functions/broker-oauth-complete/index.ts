// Broker OAuth — step 2: consume the callback, validate the session with the
// broker, encrypt the credentials, and link the account.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import {
  parseOAuthCallback,
  getOAuthProvider,
  checkBrokerHealth,
  encryptSecret,
  encryptionAvailable,
  BrokerError,
  recoveryAction,
  type BrokerCredentials,
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

function fail(error: unknown, status = 400) {
  const err = error instanceof BrokerError
    ? error
    : new BrokerError({ broker: "unknown", code: "OAUTH_CALLBACK_FAILED", message: (error as Error)?.message || String(error) });
  console.error("broker-oauth-complete failed:", err.code, err.message);
  return json({
    ok: false,
    error_code: err.code,
    message: err.message,
    hint: err.hint ?? null,
    recovery: recoveryAction(err.code),
  }, status);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await service.auth.getUser(token);
    if (authErr || !user) return json({ ok: false, error_code: "AUTH_FAILED", message: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(body.params || {})) params[k] = String(v ?? "");

    const stateValue = String(body.state || params.state || "");
    if (!stateValue) {
      throw new BrokerError({ broker: "unknown", code: "OAUTH_STATE_INVALID", message: "Missing authorization state." });
    }

    const { data: stateRow } = await service
      .from("broker_oauth_states")
      .select("*")
      .eq("state", stateValue)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!stateRow) {
      throw new BrokerError({
        broker: "unknown", code: "OAUTH_STATE_INVALID",
        message: "This authorization link is not valid for your account.",
      });
    }
    if (stateRow.consumed_at) {
      throw new BrokerError({
        broker: stateRow.broker_type, code: "OAUTH_STATE_INVALID",
        message: "This authorization has already been used.",
      });
    }
    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
      throw new BrokerError({
        broker: stateRow.broker_type, code: "OAUTH_STATE_INVALID",
        message: "The authorization link expired before it was completed.",
      });
    }

    const brokerType = String(stateRow.broker_type);
    const provider = getOAuthProvider(brokerType)!;
    const linked = parseOAuthCallback(brokerType, params);

    if (!encryptionAvailable()) {
      throw new BrokerError({
        broker: brokerType, code: "CONFIG_MISSING",
        message: "Credential encryption is not configured on the server.",
        hint: "Set BROKER_ENCRYPTION_KEY and retry the connection.",
      });
    }

    // Only keep accounts matching the requested environment when one was set.
    const wanted = String(stateRow.environment || "").toLowerCase();
    const accounts = wanted === "live" || wanted === "demo"
      ? (linked.filter(a => a.environment === wanted).length ? linked.filter(a => a.environment === wanted) : linked)
      : linked;

    const now = new Date().toISOString();
    const results: Array<Record<string, unknown>> = [];
    let primaryId: string | null = null;

    for (const account of accounts) {
      // Validate the freshly issued session before persisting it.
      const probe: BrokerCredentials = {
        user_id: user.id,
        broker_type: brokerType,
        api_token: account.token,
        account_id: account.accountId,
        environment: account.environment,
        account_type: account.environment,
        account_name: stateRow.account_name || `${provider.displayName} ${account.accountId}`,
        metadata: { auth_method: "oauth" },
      };
      (probe as any).auth_method = "oauth";

      const health = await checkBrokerHealth(probe);
      if (!health.connected) {
        results.push({ account_id: account.accountId, ok: false, message: health.message });
        continue;
      }

      const encryptedToken = await encryptSecret(account.token);
      const metadata = {
        auth_method: "oauth",
        oauth_provider: provider.broker,
        currency: account.currency,
        connected_via: "oauth",
        last_test: {
          ok: true,
          message: health.message,
          code: null,
          hint: null,
          latency_ms: health.latencyMs,
          environment: health.environment,
          required_scopes: provider.scopes,
          missing_scopes: [],
          tested_at: health.checkedAt,
        },
      };

      const { data: existing } = await service
        .from("broker_credentials")
        .select("id, metadata")
        .eq("user_id", user.id)
        .eq("broker_type", brokerType)
        .eq("account_id", account.accountId)
        .maybeSingle();

      const row = {
        user_id: user.id,
        broker_type: brokerType,
        account_name: stateRow.account_name || `${provider.displayName} ${account.accountId}`,
        account_id: account.accountId,
        login: account.accountId,
        server: provider.broker,
        environment: account.environment,
        account_type: account.environment,
        api_token: encryptedToken,
        auth_method: "oauth",
        secrets_encrypted: true,
        oauth_scopes: provider.scopes,
        oauth_expires_at: null,
        last_connected_at: now,
        is_active: true,
        encrypted_password: "n/a",
        metadata: { ...(existing?.metadata as Record<string, unknown> || {}), ...metadata },
        updated_at: now,
      };

      if (existing?.id) {
        const { error } = await service.from("broker_credentials").update(row).eq("id", existing.id);
        if (error) throw new Error(error.message);
        primaryId = primaryId || existing.id;
        results.push({ account_id: account.accountId, ok: true, id: existing.id, message: health.message, reconnected: true });
      } else {
        const { data: inserted, error } = await service
          .from("broker_credentials").insert(row).select("id").single();
        if (error) throw new Error(error.message);
        primaryId = primaryId || inserted.id;
        results.push({ account_id: account.accountId, ok: true, id: inserted.id, message: health.message });
      }
    }

    await service.from("broker_oauth_states").update({ consumed_at: now }).eq("id", stateRow.id);

    const linkedOk = results.filter(r => r.ok);
    if (!linkedOk.length) {
      throw new BrokerError({
        broker: brokerType, code: "OAUTH_EXCHANGE_FAILED",
        message: `The ${provider.displayName} session could not be verified.`,
        hint: String(results[0]?.message || ""),
      });
    }

    return json({
      ok: true,
      broker: brokerType,
      linked: results,
      primary_credential_id: primaryId,
      message: `${provider.displayName} connected — ${linkedOk.length} account${linkedOk.length > 1 ? "s" : ""} linked.`,
      return_to: stateRow.return_to || null,
    });
  } catch (error) {
    return fail(error);
  }
});
