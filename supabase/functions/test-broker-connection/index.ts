import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

const REQUIRED_SCOPES: Record<string, string[]> = {
  deriv:   ["read", "trade", "trading_information", "payments"],
  binance: ["Enable Reading", "Enable Spot & Margin & Stock Trading"],
  oanda:   ["Read account", "Trade"],
  capital: ["Trading API enabled", "Custom password set"],
  mt5:     ["Investor / Master password", "Trading enabled"],
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
    if (m.includes("invalidtoken") || m.includes("token")) out.push("read", "trade");
    if (m.includes("permission") || m.includes("scope")) out.push("trade", "payments");
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

async function testBroker(cred: any): Promise<{ ok: boolean; message: string; details?: any; missingScopes?: string[]; detectedEnvironment?: string }> {
  const token = cred.api_token;
  const env = cred.environment || "demo";
  try {
    switch (cred.broker_type) {
      case "deriv": {
        const cleanToken = String(token || "").trim();
        if (!cleanToken) return { ok: false, message: "API token missing", missingScopes: ["read", "trade"] };
        const appId = Deno.env.get("DERIV_APP_ID") || "1089";
        const url = `wss://ws.derivws.com/websockets/v3?app_id=${appId}`;
        return await new Promise((resolve) => {
          let ws: WebSocket;
          try { ws = new WebSocket(url); }
          catch (err) { return resolve({ ok: false, message: `Deriv WS init failed: ${(err as Error).message}` }); }
          const timer = setTimeout(() => { try { ws.close(); } catch {} resolve({ ok: false, message: "Timeout connecting to Deriv (15s)" }); }, 15000);
          ws.onopen = () => { try { ws.send(JSON.stringify({ authorize: cleanToken })); } catch (err) { clearTimeout(timer); resolve({ ok: false, message: `Deriv send failed: ${(err as Error).message}` }); } };
          ws.onmessage = (e) => {
            clearTimeout(timer);
            let data: any = {};
            try { data = JSON.parse(e.data); } catch { data = { error: { message: "Invalid Deriv response" } }; }
            try { ws.close(); } catch {}
            if (data.error) {
              const code = data.error.code || "";
              const msg = data.error.message || "Deriv rejected token";
              const missing: string[] = [];
              if (/InvalidToken|AuthorizationRequired/i.test(code)) missing.push("read", "trade");
              if (/PermissionDenied|scope/i.test(code + msg)) missing.push("trade", "payments");
              resolve({ ok: false, message: `${msg}${code ? ` [${code}]` : ""}`, missingScopes: missing });
            } else {
              const scopes: string[] = data.authorize?.scopes || [];
              const required = ["read", "trade"];
              const missing = required.filter((s) => !scopes.includes(s));
              resolve({
                ok: missing.length === 0,
                message: missing.length === 0
                  ? `Authorized as ${data.authorize?.loginid}`
                  : `Token missing scopes: ${missing.join(", ")}`,
                details: { balance: data.authorize?.balance, currency: data.authorize?.currency, scopes, loginid: data.authorize?.loginid },
                missingScopes: missing,
              });
            }
          };
          ws.onerror = (err: any) => { clearTimeout(timer); resolve({ ok: false, message: `Deriv WebSocket error: ${err?.message || "connection failed"}` }); };
          ws.onclose = (ev) => { if (ev && ev.code && ev.code !== 1000 && ev.code !== 1005) { clearTimeout(timer); resolve({ ok: false, message: `Deriv closed connection (code ${ev.code})` }); } };
        });
      }
      case "binance": {
        if (!token || !cred.api_secret) return { ok: false, message: "API key/secret missing", missingScopes: ["Enable Reading"] };
        const secretCandidates = decodeSecretCandidates(cred.api_secret);
        const cleanToken = String(token).trim();
        const primaryEnv = env === "live" ? "live" : "demo";

        const tryAll = async (envToTest: "demo" | "live") => {
          let last: any = null;
          for (const s of secretCandidates) {
            const r = await testBinanceAccount(cleanToken, s, envToTest);
            if (r.ok) return r;
            last = r;
            if (!isBinanceRejectedKey(r.message) && !isBinanceSignatureError(r.message)) return r;
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
        if (!token || !cred.account_id) return { ok: false, message: "Token/account_id missing", missingScopes: ["Read account"] };
        const base = env === "live" ? "https://api-fxtrade.oanda.com" : "https://api-fxpractice.oanda.com";
        const r = await fetch(`${base}/v3/accounts/${cred.account_id}/summary`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json();
        if (!r.ok) return { ok: false, message: j.errorMessage || `HTTP ${r.status}` };
        return { ok: true, message: "Connected", details: { balance: j.account?.balance, currency: j.account?.currency } };
      }
      case "capital": {
        if (!token || !cred.account_id || !cred.encrypted_password) return { ok: false, message: "Credentials missing", missingScopes: ["Custom password set"] };
        const base = env === "live" ? "https://api-capital.backend-capital.com" : "https://demo-api-capital.backend-capital.com";
        const pwd = atob(cred.encrypted_password);
        const r = await fetch(`${base}/api/v1/session`, {
          method: "POST",
          headers: { "X-CAP-API-KEY": token, "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: cred.account_id, password: pwd }),
        });
        if (!r.ok) { const t = await r.text(); return { ok: false, message: `HTTP ${r.status}: ${t.slice(0,120)}` }; }
        return { ok: true, message: "Session created" };
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
  const raw = String(stored || "").trim();
  const out: string[] = [];
  // Try base64 decode first (new format)
  try {
    const decoded = atob(raw);
    if (decoded && /^[\x20-\x7E]+$/.test(decoded)) out.push(decoded);
  } catch (_) { /* not base64 */ }
  // Fall back to raw (legacy plaintext saves)
  if (!out.includes(raw)) out.push(raw);
  return out;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
