import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REQUIRED_SCOPES: Record<string, string[]> = {
  deriv:   ["trade", "account_manage"],
  binance: ["Enable Reading", "Enable Spot & Margin & Stock Trading"],
  oanda:   ["Read account", "Trade"],
  capital: ["Trading API enabled", "Custom password set"],
  mt5:     ["Investor / Master password", "Trading enabled"],
};

type BrokerTestResult = {
  ok: boolean;
  message: string;
  details?: any;
  missingScopes?: string[];
  detectedEnvironment?: string;
  credentialAccepted?: boolean;
  normalizedCredentialUpdates?: Record<string, unknown>;
};

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

    const { data: cred, error: cErr } = await service.from("broker_credentials")
      .select("*").eq("id", credentialId).eq("user_id", user.id).maybeSingle();
    if (cErr || !cred) throw new Error("Broker credential not found");

    const result = await testBroker(cred);
    const requiredScopes = REQUIRED_SCOPES[cred.broker_type] || [];
    const missingScopes = result.missingScopes ?? inferMissingScopes(cred.broker_type, result.message, result.ok);

    const mergedMeta = {
      ...(cred.metadata || {}),
      last_test: {
        ok: result.ok,
        message: result.message,
        details: result.details ?? null,
        required_scopes: requiredScopes,
        missing_scopes: missingScopes,
        credential_normalized: Boolean(result.normalizedCredentialUpdates),
        tested_at: new Date().toISOString(),
      },
    };

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      metadata: mergedMeta,
    };

    if (result.detectedEnvironment && result.detectedEnvironment !== cred.environment) {
      updatePayload.environment = result.detectedEnvironment;
      updatePayload.account_type = result.detectedEnvironment;
    }

    if (result.normalizedCredentialUpdates && (result.ok || result.credentialAccepted)) {
      const normalized = { ...result.normalizedCredentialUpdates };
      if (normalized.metadata && typeof normalized.metadata === "object") {
        normalized.metadata = { ...mergedMeta, ...(normalized.metadata as Record<string, unknown>) };
      }
      Object.assign(updatePayload, normalized);
    }

    if (shouldDeactivateForFailedTest(result, missingScopes)) {
      updatePayload.is_active = false;
    }

    await service.from("broker_credentials").update(updatePayload).eq("id", credentialId);

    return json({
      ok: result.ok,
      broker: cred.broker_type,
      message: result.message,
      details: result.details,
      required_scopes: requiredScopes,
      missing_scopes: missingScopes,
    });
  } catch (e) {
    console.error("test-broker-connection error:", e);
    return json({ ok: false, error: (e as Error).message }, 400);
  }
});

function inferMissingScopes(broker: string, message: string | undefined, ok: boolean): string[] {
  if (ok) return [];
  const m = (message || "").toLowerCase();
  const out: string[] = [];
  if (broker === "deriv") {
    if (m.includes("invalidtoken") || m.includes("invalid token") || m.includes("authentication")) out.push("trade");
    if (m.includes("permission") || m.includes("scope") || m.includes("forbidden")) out.push("trade", "account_manage");
  } else if (broker === "binance") {
    if (m.includes("api-key") || m.includes("invalid api")) out.push("Enable Reading");
    if (m.includes("permission") || m.includes("trading")) out.push("Enable Spot & Margin Trading");
    if (m.includes("ip")) out.push("Whitelist server IP or disable IP restriction");
  } else if (broker === "oanda") {
    if (m.includes("insufficient") || m.includes("unauthor")) out.push("Read account", "Trade");
  } else if (broker === "capital") {
    if (m.includes("401") || m.includes("invalid")) out.push("Trading API enabled", "Custom password set");
  }
  return Array.from(new Set(out));
}

function shouldDeactivateForFailedTest(result: BrokerTestResult, missingScopes: string[]) {
  if (result.ok) return false;
  const m = String(result.message || "").toLowerCase();
  return missingScopes.length > 0 ||
    isCredentialFormatError(m) ||
    m.includes("missing") ||
    m.includes("permission") ||
    m.includes("scope");
}

async function testBroker(cred: any): Promise<BrokerTestResult> {
  const token = cred.api_token;
  const env = cred.environment || "demo";
  try {
    switch (cred.broker_type) {
      case "deriv": {
        const tokenCandidates = credentialCandidates(token);
        if (tokenCandidates.length === 0) return { ok: false, message: "API token missing", missingScopes: ["read", "trade"] };
        let last: BrokerTestResult | null = null;
        for (const cleanToken of tokenCandidates) {
          const derivConfig = resolveDerivConfig(cred, cleanToken);
          const result = await testDerivToken(cleanToken, derivConfig, cred);
          last = result;
          if (result.ok || result.credentialAccepted) {
            const normalized = normalizedUpdates([[cred.api_token, cleanToken, "api_token", false]]) || {};
            const accountId = result.details?.account_id || result.details?.loginid || null;
            return {
              ...result,
              normalizedCredentialUpdates: {
                ...normalized,
                metadata: {
                  credential_kind: derivConfig.tokenKind,
                  ...(derivConfig.appId ? { deriv_app_id: derivConfig.appId, deriv_app_id_source: derivConfig.source } : {}),
                },
                ...(accountId ? { account_id: accountId, login: accountId } : {}),
              },
            };
          }
          if (!isCredentialFormatError(result.message)) return result;
        }
        return last || { ok: false, message: "Deriv token rejected" };
      }
      case "binance": {
        if (!token || !cred.api_secret) return { ok: false, message: "API key/secret missing", missingScopes: ["Enable Reading"] };
        const tokenCandidates = credentialCandidates(token);
        const secretCandidates = decodeSecretCandidates(cred.api_secret);
        const primaryEnv = env === "live" ? "live" : "demo";

        const tryAll = async (envToTest: "demo" | "live") => {
          let last: any = null;
          for (const cleanToken of tokenCandidates) {
            for (const s of secretCandidates) {
              const r = await testBinanceAccount(cleanToken, s, envToTest);
              if (r.ok) {
                return {
                  ...r,
                  normalizedCredentialUpdates: normalizedUpdates([
                    [cred.api_token, cleanToken, "api_token", false],
                    [cred.api_secret, s, "api_secret", true],
                  ]),
                };
              }
              last = r;
              if (!isBinanceRejectedKey(r.message) && !isBinanceSignatureError(r.message)) return r;
            }
          }
          return last;
        };

        const primary = await tryAll(primaryEnv);
        if (primary.ok) return primary;

        if (primaryEnv !== "live" && isBinanceRejectedKey(primary.message)) {
          const live = await tryAll("live");
          if (live.ok) {
            return {
              ...live,
              detectedEnvironment: "live",
              message: `${live.message} — detected as Binance.com live API key and updated from Demo/Testnet to Live.`,
            };
          }
          return {
            ...live,
            message: `${primary.message}. Binance.com API keys must be saved as Live; Demo/Testnet requires a separate key from testnet.binance.vision. Live check also failed: ${live.message}`,
          };
        }

        return primary;
      }
      case "oanda": {
        const tokenCandidates = credentialCandidates(token);
        const accountId = String(cred.account_id || "").trim();
        if (tokenCandidates.length === 0 || !accountId) return { ok: false, message: "Token/account_id missing", missingScopes: ["Read account"] };
        const base = env === "live" ? "https://api-fxtrade.oanda.com" : "https://api-fxpractice.oanda.com";
        let last: BrokerTestResult | null = null;
        for (const cleanToken of tokenCandidates) {
          const r = await fetch(`${base}/v3/accounts/${accountId}/summary`, { headers: { Authorization: `Bearer ${cleanToken}` } });
          const j = await r.json().catch(() => ({}));
          if (r.ok) {
            return {
              ok: true,
              message: "Connected",
              details: { balance: j.account?.balance, currency: j.account?.currency },
              credentialAccepted: true,
              normalizedCredentialUpdates: normalizedUpdates([[cred.api_token, cleanToken, "api_token", false], [cred.account_id, accountId, "account_id", false]]),
            };
          }
          last = { ok: false, message: j.errorMessage || `HTTP ${r.status}` };
          if (!isCredentialFormatError(last.message)) return last;
        }
        return last || { ok: false, message: "OANDA token rejected" };
      }
      case "capital": {
        const apiKeyCandidates = credentialCandidates(token);
        const passwordCandidates = decodeSecretCandidates(cred.encrypted_password || "");
        const identifier = String(cred.account_id || "").trim();
        if (apiKeyCandidates.length === 0 || !identifier || passwordCandidates.length === 0) return { ok: false, message: "Credentials missing", missingScopes: ["Custom password set"] };
        const base = env === "live" ? "https://api-capital.backend-capital.com" : "https://demo-api-capital.backend-capital.com";
        let last: BrokerTestResult | null = null;
        for (const cleanApiKey of apiKeyCandidates) {
          for (const pwd of passwordCandidates) {
            const r = await fetch(`${base}/api/v1/session`, {
              method: "POST",
              headers: { "X-CAP-API-KEY": cleanApiKey, "Content-Type": "application/json" },
              body: JSON.stringify({ identifier, password: pwd }),
            });
            if (r.ok) {
              return {
                ok: true,
                message: "Session created",
                credentialAccepted: true,
                normalizedCredentialUpdates: normalizedUpdates([
                  [cred.api_token, cleanApiKey, "api_token", false],
                  [cred.account_id, identifier, "account_id", false],
                  [cred.encrypted_password, pwd, "encrypted_password", true],
                ]),
              };
            }
            const t = await r.text();
            last = { ok: false, message: `HTTP ${r.status}: ${t.slice(0,120)}` };
            if (!isCredentialFormatError(last.message)) return last;
          }
        }
        return last || { ok: false, message: "Capital.com credentials rejected" };
      }
      case "mt5": {
        return { ok: false, message: "MT5 validation requires MetaApi bridge — not tested here" };
      }
      default:
        return { ok: false, message: `Unknown broker: ${cred.broker_type}` };
    }
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

async function hmacSha256Hex(secret: string, payload: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function testBinanceAccount(token: string, secret: string, environment: "demo" | "live") {
  const base = environment === "live" ? "https://api.binance.com" : "https://testnet.binance.vision";
  const ts = Date.now();
  const query = `timestamp=${ts}`;
  const sig = await hmacSha256Hex(secret, query);
  const r = await fetch(`${base}/api/v3/account?${query}&signature=${sig}`, { headers: { "X-MBX-APIKEY": token } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const rawMessage = j.msg || `HTTP ${r.status}`;
    const message = r.status === 401 && isBinanceRejectedKey(rawMessage)
      ? `${rawMessage} (${environment === "live" ? "Binance.com Live" : "Binance Spot Testnet"})`
      : rawMessage;
    return { ok: false, message };
  }
  const missing: string[] = [];
  if (!j.canTrade) missing.push("Enable Spot & Margin & Stock Trading");
  return {
    ok: missing.length === 0,
    message: missing.length === 0 ? `Connected to ${environment === "live" ? "Binance.com Live" : "Binance Spot Testnet"}` : "Missing trading permission",
    details: { environment, canTrade: j.canTrade, balances: (j.balances || []).filter((b: any) => parseFloat(b.free) > 0).slice(0, 5) },
    missingScopes: missing,
    detectedEnvironment: environment,
  };
}

function isBinanceRejectedKey(message: string) {
  const m = String(message || "").toLowerCase();
  return m.includes("invalid api-key") || m.includes("invalid api key") || m.includes("-2015") || m.includes("-2014");
}

function isBinanceSignatureError(message: string) {
  const m = String(message || "").toLowerCase();
  return m.includes("signature") || m.includes("-1022") || m.includes("-1021");
}

function decodeSecretCandidates(stored: string): string[] {
  return credentialCandidates(stored);
}

function credentialCandidates(stored: unknown): string[] {
  const raw = String(stored || "").trim();
  if (!raw) return [];
  const out: string[] = [];
  const push = (value: unknown) => {
    const cleaned = cleanCredentialValue(value);
    if (cleaned && !out.includes(cleaned)) out.push(cleaned);
  };

  push(raw);

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") push(parsed);
    else if (parsed && typeof parsed === "object") {
      for (const key of ["token", "api_token", "apiToken", "api_key", "apiKey", "secret", "password", "value"]) {
        if (typeof parsed[key] === "string") push(parsed[key]);
      }
    }
  } catch (_) { /* not JSON */ }

  try {
    const decoded = atob(raw);
    if (decoded && /^[\x09\x0A\x0D\x20-\x7E]+$/.test(decoded)) {
      push(decoded);
      try {
        const parsedDecoded = JSON.parse(decoded);
        if (typeof parsedDecoded === "string") push(parsedDecoded);
        else if (parsedDecoded && typeof parsedDecoded === "object") {
          for (const key of ["token", "api_token", "apiToken", "api_key", "apiKey", "secret", "password", "value"]) {
            if (typeof parsedDecoded[key] === "string") push(parsedDecoded[key]);
          }
        }
      } catch (_) { /* decoded value is not JSON */ }
    }
  } catch (_) { /* not base64 */ }

  return out;
}

function cleanCredentialValue(value: unknown): string {
  let cleaned = String(value || "").trim();
  if (!cleaned) return "";
  cleaned = cleaned.replace(/^['"`]+|['"`]+$/g, "").trim();
  cleaned = cleaned.replace(/^Bearer\s+/i, "").trim();
  cleaned = cleaned.replace(/^(token|api[_ -]?token|api[_ -]?key|secret|password)\s*[:=]\s*/i, "").trim();
  cleaned = cleaned.replace(/^['"`]+|['"`]+$/g, "").trim();
  return cleaned;
}

function isCredentialFormatError(message: string | undefined) {
  const m = String(message || "").toLowerCase();
  return m.includes("invalidtoken") || m.includes("invalid token") || m.includes("token is invalid") ||
    m.includes("invalid api-key") || m.includes("invalid api key") || m.includes("unauthor") ||
    m.includes("signature") || m.includes("-1022") || m.includes("-2014") || m.includes("-2015") ||
    m.includes("401") || m.includes("403");
}

function normalizedUpdates(entries: Array<[unknown, string, string, boolean]>): Record<string, unknown> | undefined {
  const updates: Record<string, unknown> = {};
  for (const [stored, accepted, column, encode] of entries) {
    const current = cleanCredentialValue(stored);
    if (!accepted || accepted === current) continue;
    updates[column] = encode ? btoa(accepted) : accepted;
  }
  return Object.keys(updates).length ? updates : undefined;
}

function withNormalizedUpdate(result: BrokerTestResult, stored: unknown, accepted: string, column: string): BrokerTestResult {
  return {
    ...result,
    normalizedCredentialUpdates: normalizedUpdates([[stored, accepted, column, false]]),
  };
}

type DerivConfig = {
  tokenKind: "pat" | "legacy";
  appId: string;
  source: "credential" | "secret" | "legacy_default" | "missing";
};

function resolveDerivConfig(cred: any, cleanToken: string): DerivConfig {
  const tokenKind = cleanToken.startsWith("pat_") ? "pat" : "legacy";
  const metadataAppId = cleanCredentialValue(cred.metadata?.deriv_app_id || cred.metadata?.app_id || "");
  const patSecretAppId = cleanCredentialValue(Deno.env.get("DERIV_PAT_APP_ID") || "");
  const legacySecretAppId = cleanCredentialValue(Deno.env.get("DERIV_APP_ID") || "");

  if (metadataAppId) return { tokenKind, appId: metadataAppId, source: "credential" };
  if (tokenKind === "pat" && patSecretAppId) return { tokenKind, appId: patSecretAppId, source: "secret" };
  if (legacySecretAppId) return { tokenKind, appId: legacySecretAppId, source: "secret" };
  if (tokenKind === "legacy") return { tokenKind, appId: "1089", source: "legacy_default" };
  return { tokenKind, appId: "", source: "missing" };
}

async function testDerivToken(cleanToken: string, config: DerivConfig, cred: any): Promise<BrokerTestResult> {
  if (config.tokenKind === "pat") return testDerivPatToken(cleanToken, config, cred);
  return testDerivLegacyToken(cleanToken, config.appId || "1089");
}

async function testDerivPatToken(cleanToken: string, config: DerivConfig, cred: any): Promise<BrokerTestResult> {
  if (!config.appId) {
    return {
      ok: false,
      credentialAccepted: true,
      message: "Deriv PAT token detected, but the matching Deriv App ID is missing. Edit this broker and add the App ID from the same PAT application.",
      missingScopes: [],
      details: { token_kind: "pat", app_id_required: true },
    };
  }

  try {
    const response = await fetch("https://api.derivws.com/trading/v1/options/accounts", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        "Deriv-App-ID": config.appId,
      },
    });
    const raw = await response.text();
    const body = parseJson(raw);
    if (!response.ok) {
      return derivRestFailure(response.status, raw, body, config);
    }

    const accounts = Array.isArray(body?.data) ? body.data : [];
    const preferred = cleanCredentialValue(cred.account_id || cred.login || "");
    const env = String(cred.environment || cred.account_type || "demo").toLowerCase();
    const account = accounts.find((a: any) => preferred && a.account_id === preferred) ||
      accounts.find((a: any) => String(a.account_type || "").toLowerCase() === env && a.status === "active") ||
      accounts.find((a: any) => a.status === "active") ||
      accounts[0] || null;

    return {
      ok: Boolean(account),
      credentialAccepted: true,
      message: account ? `Deriv PAT authorized for ${account.account_id}` : "Deriv PAT authorized, but no trading account was returned",
      details: {
        token_kind: "pat",
        account_id: account?.account_id || null,
        balance: account?.balance ?? null,
        currency: account?.currency || null,
        account_type: account?.account_type || null,
        accounts: accounts.map((a: any) => ({ account_id: a.account_id, account_type: a.account_type, status: a.status, currency: a.currency })),
      },
      missingScopes: account ? [] : ["account_manage"],
    };
  } catch (error) {
    return { ok: false, message: `Deriv PAT validation failed: ${(error as Error).message}` };
  }
}

function derivRestFailure(status: number, raw: string, body: any, config: DerivConfig): BrokerTestResult {
  const firstError = Array.isArray(body?.errors) ? body.errors[0] : null;
  const code = String(firstError?.code || "");
  const message = String(firstError?.message || raw || `HTTP ${status}`).trim();
  const lower = message.toLowerCase();

  if (lower.includes("invalid application")) {
    return {
      ok: false,
      credentialAccepted: true,
      message: "Deriv PAT reached the new API, but the saved App ID is invalid or does not match this PAT application. Edit this broker and enter the App ID shown beside the PAT in Deriv.",
      missingScopes: [],
      details: { token_kind: "pat", app_id_source: config.source },
    };
  }

  if (status === 403 || /permission|scope|accessdenied/i.test(code + message)) {
    return { ok: false, message: `${message}${code ? ` [${code}]` : ""}`, missingScopes: ["trade", "account_manage"] };
  }

  if (status === 401) {
    return { ok: false, message: `${message}${code ? ` [${code}]` : ""}`, missingScopes: ["trade"] };
  }

  return { ok: false, message: `${message}${code ? ` [${code}]` : ""}` };
}

function parseJson(raw: string) {
  try { return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}

async function testDerivLegacyToken(cleanToken: string, appId: string): Promise<BrokerTestResult> {
  const url = `wss://ws.derivws.com/websockets/v3?app_id=${appId}`;
  return await new Promise((resolve) => {
    let settled = false;
    let ws: WebSocket;
    const finish = (result: BrokerTestResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws?.close(); } catch {}
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ok: false, message: "Timeout connecting to Deriv (15s)" }), 15000);
    try { ws = new WebSocket(url); }
    catch (err) { return finish({ ok: false, message: `Deriv WS init failed: ${(err as Error).message}` }); }
    ws.onopen = () => {
      try { ws.send(JSON.stringify({ authorize: cleanToken })); }
      catch (err) { finish({ ok: false, message: `Deriv send failed: ${(err as Error).message}` }); }
    };
    ws.onmessage = (e) => {
      let data: any = {};
      try { data = JSON.parse(e.data); } catch { data = { error: { message: "Invalid Deriv response" } }; }
      if (data.error) {
        const code = data.error.code || "";
        const msg = data.error.message || "Deriv rejected token";
        const missing: string[] = [];
        if (/InvalidToken|AuthorizationRequired/i.test(code)) missing.push("read", "trade");
        if (/PermissionDenied|scope/i.test(code + msg)) missing.push("trade", "payments");
        finish({ ok: false, message: `${msg}${code ? ` [${code}]` : ""}`, missingScopes: Array.from(new Set(missing)) });
      } else {
        const scopes: string[] = data.authorize?.scopes || [];
        const required = ["read", "trade"];
        const missing = required.filter((s) => !scopes.includes(s));
        finish({
          ok: missing.length === 0,
          credentialAccepted: true,
          message: missing.length === 0
            ? `Authorized as ${data.authorize?.loginid}`
            : `Token missing scopes: ${missing.join(", ")}`,
          details: { balance: data.authorize?.balance, currency: data.authorize?.currency, scopes, loginid: data.authorize?.loginid },
          missingScopes: missing,
        });
      }
    };
    ws.onerror = (err: any) => finish({ ok: false, message: `Deriv WebSocket error: ${err?.message || "connection failed"}` });
    ws.onclose = (ev) => {
      if (!settled && ev && ev.code && ev.code !== 1000 && ev.code !== 1005) finish({ ok: false, message: `Deriv closed connection (code ${ev.code})` });
    };
  });
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
