// Broker OAuth — step 2: consume the callback, verify state + PKCE, validate every
// returned account with the Universal Broker SDK, encrypt credentials, and link them.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import {
  redeemOAuthCallback,
  getOAuthProvider,
  getBrokerAccountInfo,
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

function b64url(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function pkceChallenge(verifier: string) {
  return b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let userId: string | null = null;
  let brokerType = "deriv";
  let stateValue = "";

  const log = async (step: string, status: string, message: string, details: Record<string, unknown> = {}) => {
    console.log(JSON.stringify({ fn: "broker-oauth-complete", step, status, message, at: new Date().toISOString(), ...details }));
    if (!userId) return;
    await service.from("broker_oauth_events").insert({
      user_id: userId, broker_type: brokerType, state: stateValue || null, step, status, message, details,
    });
  };

  const fail = async (error: unknown, status = 400) => {
    const err = error instanceof BrokerError
      ? error
      : new BrokerError({ broker: brokerType, code: "OAUTH_CALLBACK_FAILED", message: (error as Error)?.message || String(error) });
    await log("failure", "error", err.message, { error_code: err.code, hint: err.hint ?? null });
    return json({
      ok: false,
      error_code: err.code,
      message: err.message,
      hint: err.hint ?? null,
      recovery: recoveryAction(err.code),
    }, status);
  };

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user }, error: authErr } = await service.auth.getUser(token);
    if (authErr || !user) return json({ ok: false, error_code: "AUTH_FAILED", message: "Unauthorized" }, 401);
    userId = user.id;

    const body = await req.json().catch(() => ({}));
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(body.params || {})) params[k] = String(v ?? "");

    stateValue = String(body.state || params.state || "");
    const codeVerifier = String(body.codeVerifier || "");

    await log("callback_received", "info", "OAuth callback received", {
      param_keys: Object.keys(params), has_verifier: !!codeVerifier,
    });

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
        hint: "Start the connection again from Broker Accounts.",
      });
    }
    brokerType = String(stateRow.broker_type);

    if (stateRow.consumed_at) {
      throw new BrokerError({
        broker: brokerType, code: "OAUTH_STATE_INVALID",
        message: "This authorization has already been used.",
        hint: "Start a new connection if you need to link another account.",
      });
    }
    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
      throw new BrokerError({
        broker: brokerType, code: "OAUTH_STATE_INVALID",
        message: "The authorization link expired before it was completed.",
        hint: "Connections must be completed within 15 minutes.",
      });
    }
    await log("state_validated", "success", "Authorization state validated");

    // PKCE verification (app-side proof that the callback belongs to this browser session).
    if (stateRow.code_challenge) {
      if (!codeVerifier) {
        throw new BrokerError({
          broker: brokerType, code: "OAUTH_STATE_INVALID",
          message: "The security verifier for this connection is missing.",
          hint: "Complete the connection in the same browser tab you started it from.",
        });
      }
      const computed = stateRow.code_challenge_method === "plain"
        ? codeVerifier
        : await pkceChallenge(codeVerifier);
      if (computed !== stateRow.code_challenge) {
        throw new BrokerError({
          broker: brokerType, code: "OAUTH_STATE_INVALID",
          message: "The security verifier for this connection did not match.",
          hint: "Start the connection again from Broker Accounts.",
        });
      }
      await log("pkce_verified", "success", "PKCE verifier matched");
    }

    const provider = getOAuthProvider(brokerType)!;

    // Exchange the single-use authorization code for tokens on the server, then
    // discover every trading account the grant covers.
    const { tokens, accounts: linked } = await redeemOAuthCallback({
      broker: brokerType,
      params,
      redirectUri: String(stateRow.redirect_uri),
      codeVerifier,
    });
    await log("code_exchanged", "success", `${provider.displayName} returned ${linked.length} authorized account(s)`, {
      accounts: linked.map(a => a.accountId),
      scopes: tokens.scopes,
      refreshable: !!tokens.refreshToken,
      expires_at: tokens.expiresAt,
    });

    if (!encryptionAvailable()) {
      throw new BrokerError({
        broker: brokerType, code: "CONFIG_MISSING",
        message: "Credential encryption is not configured on the server.",
        hint: "Set BROKER_ENCRYPTION_KEY and retry the connection.",
      });
    }

    // Link EVERY account the broker returned — real, demo and every currency wallet.
    const now = new Date().toISOString();
    const results: Array<Record<string, unknown>> = [];
    let primaryId: string | null = null;
    let primaryIsLive = false;

    for (const account of linked) {
      const probe: BrokerCredentials = {
        user_id: user.id,
        broker_type: brokerType,
        api_token: account.token,
        account_id: account.accountId,
        environment: account.environment,
        account_type: account.environment,
        account_name: `${provider.displayName} ${account.accountId}`,
        metadata: { auth_method: "oauth" },
      };
      (probe as any).auth_method = "oauth";

      let info: any = null;
      let permissions: any = null;
      try {
        const res = await getBrokerAccountInfo(probe);
        info = res.info;
        permissions = res.permissions;
      } catch (error) {
        const err = error as BrokerError;
        await log("account_sync_failed", "error", `${account.accountId}: ${err.message}`, { account_id: account.accountId });
        results.push({ account_id: account.accountId, ok: false, message: err.message });
        continue;
      }

      const encryptedToken = await encryptSecret(account.token);
      const landingCompany = (info.raw as any)?.landing_company || null;
      const accountName = `${provider.displayName} ${account.accountId} (${account.environment === "live" ? "Real" : "Demo"}${account.currency ? ` · ${account.currency}` : ""})`;

      const metadata = {
        auth_method: "oauth",
        oauth_provider: provider.broker,
        currency: account.currency || info.currency,
        landing_company: landingCompany,
        balance_currency: account.currency,
        connected_via: "oauth",
        permissions,
        last_test: {
          ok: true,
          message: `Connected to ${provider.displayName} ${account.accountId} — ${Number(info.balance || 0).toFixed(2)} ${info.currency}`,
          code: null,
          hint: null,
          latency_ms: null,
          environment: account.environment,
          required_scopes: provider.scopes,
          missing_scopes: permissions?.missing || [],
          tested_at: now,
        },
      };

      const { data: existing } = await service
        .from("broker_credentials")
        .select("id, metadata, account_name, is_default")
        .eq("user_id", user.id)
        .eq("broker_type", brokerType)
        .eq("account_id", account.accountId)
        .maybeSingle();

      const row: Record<string, unknown> = {
        user_id: user.id,
        broker_type: brokerType,
        account_name: existing?.account_name || accountName,
        account_id: account.accountId,
        login: account.accountId,
        server: provider.broker,
        environment: account.environment,
        account_type: account.environment,
        api_token: encryptedToken,
        auth_method: "oauth",
        secrets_encrypted: true,
        oauth_scopes: tokens.scopes.length ? tokens.scopes : provider.scopes,
        oauth_refresh_token: tokens.refreshToken ? await encryptSecret(tokens.refreshToken) : null,
        oauth_expires_at: tokens.expiresAt,
        last_connected_at: now,
        last_synced_at: now,
        balance: Number(info.balance ?? account.balance ?? 0),
        currency: account.currency || info.currency || null,
        landing_company: landingCompany,
        is_active: true,
        encrypted_password: "n/a",
        metadata: { ...((existing?.metadata as Record<string, unknown>) || {}), ...metadata },
        updated_at: now,
      };

      let credentialId: string;
      if (existing?.id) {
        const { error } = await service.from("broker_credentials").update(row).eq("id", existing.id);
        if (error) throw new Error(error.message);
        credentialId = existing.id;
      } else {
        const { data: inserted, error } = await service
          .from("broker_credentials").insert(row).select("id").single();
        if (error) throw new Error(error.message);
        credentialId = inserted.id;
      }

      // Prefer a real (live) account as the primary one.
      if (!primaryId || (!primaryIsLive && account.environment === "live")) {
        primaryId = credentialId;
        primaryIsLive = account.environment === "live";
      }

      results.push({
        account_id: account.accountId,
        ok: true,
        id: credentialId,
        environment: account.environment,
        currency: account.currency || info.currency,
        balance: Number(info.balance || 0),
        landing_company: landingCompany,
        reconnected: !!existing?.id,
      });
    }

    await service.from("broker_oauth_states").update({ consumed_at: now }).eq("id", stateRow.id);

    const linkedOk = results.filter(r => r.ok);
    if (!linkedOk.length) {
      throw new BrokerError({
        broker: brokerType, code: "OAUTH_EXCHANGE_FAILED",
        message: `The ${provider.displayName} session could not be verified.`,
        hint: String(results[0]?.message || "Retry the connection and approve all requested permissions."),
      });
    }

    // Ensure exactly one default account for this broker.
    const { data: hasDefault } = await service
      .from("broker_credentials")
      .select("id")
      .eq("user_id", user.id)
      .eq("broker_type", brokerType)
      .eq("is_default", true)
      .maybeSingle();

    if (!hasDefault && primaryId) {
      await service.from("broker_credentials").update({ is_default: true }).eq("id", primaryId);
    }

    await log("accounts_synced", "success", `${linkedOk.length} account(s) synchronized`, { results });
    await log("success", "success", `${provider.displayName} connected`);

    return json({
      ok: true,
      broker: brokerType,
      linked: results,
      primary_credential_id: primaryId,
      message: `${provider.displayName} connected — ${linkedOk.length} account${linkedOk.length > 1 ? "s" : ""} linked.`,
      return_to: stateRow.return_to || null,
    });
  } catch (error) {
    return await fail(error);
  }
});
