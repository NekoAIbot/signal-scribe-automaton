// Broker connection test — runs entirely through the Universal Broker SDK.
// No broker HTTP/WS call is made in this file; the SDK adapters own that.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import {
  checkBrokerHealth,
  describeBroker,
  isSupportedBroker,
  BrokerError,
  type BrokerCredentials,
  type HealthStatus,
} from "../_shared/broker-sdk/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Error codes that mean the credential itself (or its scopes) is the problem. */
const CREDENTIAL_FAILURE_CODES = new Set([
  "AUTH_FAILED",
  "AUTH_EXPIRED",
  "PERMISSION_DENIED",
  "IP_NOT_ALLOWED",
  "CONFIG_MISSING",
  "ENVIRONMENT_MISMATCH",
  "NOT_SUPPORTED",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function missingScopesFor(brokerType: string, health: HealthStatus, required: string[]): string[] {
  if (health.connected) return [];
  const code = String((health.details as any)?.code || "");
  if (code === "PERMISSION_DENIED") return required;
  if (code === "AUTH_FAILED" || code === "AUTH_EXPIRED" || code === "CONFIG_MISSING") return required;
  return [];
}

async function runHealth(cred: BrokerCredentials): Promise<HealthStatus> {
  try {
    return await checkBrokerHealth(cred);
  } catch (error) {
    const err = error instanceof BrokerError
      ? error
      : new BrokerError({ broker: String(cred.broker_type || "unknown"), code: "UNKNOWN", message: (error as Error).message });
    return {
      connected: false,
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
      message: err.message,
      environment: (cred.environment as any) || "demo",
      details: { code: err.code, hint: err.hint },
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authErr } = await service.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const { credentialId } = await req.json();
    if (!credentialId) throw new Error("credentialId required");

    const { data: cred, error: cErr } = await service
      .from("broker_credentials")
      .select("*")
      .eq("id", credentialId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (cErr || !cred) throw new Error("Broker credential not found");

    const descriptor = describeBroker(cred.broker_type);
    const requiredScopes = descriptor?.requiredScopes ?? [];

    if (!isSupportedBroker(cred.broker_type)) {
      const message = descriptor
        ? `${descriptor.displayName} is not available for cloud execution yet.${descriptor.notes ? ` ${descriptor.notes}` : ""}`
        : `Broker "${cred.broker_type}" is not supported.`;
      await service.from("broker_credentials").update({
        is_active: false,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(cred.metadata || {}),
          last_test: { ok: false, message, code: "NOT_SUPPORTED", required_scopes: requiredScopes, missing_scopes: [], tested_at: new Date().toISOString() },
        },
      }).eq("id", credentialId);
      return json({ ok: false, broker: cred.broker_type, message, error_code: "NOT_SUPPORTED", required_scopes: requiredScopes, missing_scopes: [] });
    }

    let health = await runHealth(cred as BrokerCredentials);
    let detectedEnvironment: string | null = null;

    // Binance.com live keys are frequently saved as demo/testnet — retry on live.
    if (
      !health.connected &&
      String(cred.broker_type).toLowerCase() === "binance" &&
      String(cred.environment || "demo").toLowerCase() !== "live" &&
      ["AUTH_FAILED", "PERMISSION_DENIED", "ENVIRONMENT_MISMATCH"].includes(String((health.details as any)?.code))
    ) {
      const liveHealth = await runHealth({ ...(cred as BrokerCredentials), environment: "live" });
      if (liveHealth.connected) {
        detectedEnvironment = "live";
        health = {
          ...liveHealth,
          message: `${liveHealth.message} — detected as a Binance.com live key; environment switched from Demo/Testnet to Live.`,
        };
      }
    }

    const errorCode = health.connected ? null : String((health.details as any)?.code || "UNKNOWN");
    const hint = (health.details as any)?.hint ?? null;
    const missingScopes = missingScopesFor(cred.broker_type, health, requiredScopes);

    const mergedMeta = {
      ...(cred.metadata || {}),
      last_test: {
        ok: health.connected,
        message: health.message,
        code: errorCode,
        hint,
        latency_ms: health.latencyMs,
        environment: health.environment,
        required_scopes: requiredScopes,
        missing_scopes: missingScopes,
        tested_at: health.checkedAt,
      },
    };

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      metadata: mergedMeta,
    };

    if (detectedEnvironment) {
      updatePayload.environment = detectedEnvironment;
      updatePayload.account_type = detectedEnvironment;
    }

    if (!health.connected && CREDENTIAL_FAILURE_CODES.has(errorCode || "")) {
      updatePayload.is_active = false;
    }

    await service.from("broker_credentials").update(updatePayload).eq("id", credentialId);

    return json({
      ok: health.connected,
      broker: cred.broker_type,
      broker_name: descriptor?.displayName ?? cred.broker_type,
      message: health.message,
      error_code: errorCode,
      hint,
      latency_ms: health.latencyMs,
      environment: detectedEnvironment || health.environment,
      details: health.details ?? null,
      required_scopes: requiredScopes,
      missing_scopes: missingScopes,
    });
  } catch (e) {
    console.error("test-broker-connection error:", e);
    return json({ ok: false, error: (e as Error).message }, 400);
  }
});
