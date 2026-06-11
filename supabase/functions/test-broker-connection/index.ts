import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
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
    // Persist status
    await service.from("broker_credentials").update({
      updated_at: new Date().toISOString(),
    }).eq("id", credentialId);

    return json({ ok: result.ok, broker: cred.broker_type, ...result });
  } catch (e) {
    console.error("test-broker-connection error:", e);
    return json({ ok: false, error: (e as Error).message }, 400);
  }
});

async function testBroker(cred: any): Promise<{ ok: boolean; message: string; details?: any }> {
  const token = cred.api_token;
  const env = cred.environment || "demo";
  try {
    switch (cred.broker_type) {
      case "deriv": {
        if (!token) return { ok: false, message: "API token missing" };
        // Use WebSocket via fetch upgrade not possible; use HTTP auth ping
        const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=1089`);
        return await new Promise((resolve) => {
          const timer = setTimeout(() => { ws.close(); resolve({ ok: false, message: "Timeout connecting to Deriv" }); }, 8000);
          ws.onopen = () => ws.send(JSON.stringify({ authorize: token }));
          ws.onmessage = (e) => {
            clearTimeout(timer);
            const data = JSON.parse(e.data);
            ws.close();
            if (data.error) resolve({ ok: false, message: data.error.message });
            else resolve({ ok: true, message: `Authorized as ${data.authorize?.loginid}`, details: { balance: data.authorize?.balance, currency: data.authorize?.currency } });
          };
          ws.onerror = () => { clearTimeout(timer); resolve({ ok: false, message: "WebSocket error" }); };
        });
      }
      case "binance": {
        if (!token || !cred.api_secret) return { ok: false, message: "API key/secret missing" };
        const base = env === "live" ? "https://api.binance.com" : "https://testnet.binance.vision";
        const secret = atob(cred.api_secret);
        const ts = Date.now();
        const query = `timestamp=${ts}`;
        const sig = await hmacSha256Hex(secret, query);
        const r = await fetch(`${base}/api/v3/account?${query}&signature=${sig}`, { headers: { "X-MBX-APIKEY": token } });
        const j = await r.json();
        if (!r.ok) return { ok: false, message: j.msg || `HTTP ${r.status}` };
        return { ok: true, message: "Connected", details: { canTrade: j.canTrade, balances: (j.balances || []).filter((b: any) => parseFloat(b.free) > 0).slice(0, 5) } };
      }
      case "oanda": {
        if (!token || !cred.account_id) return { ok: false, message: "Token/account_id missing" };
        const base = env === "live" ? "https://api-fxtrade.oanda.com" : "https://api-fxpractice.oanda.com";
        const r = await fetch(`${base}/v3/accounts/${cred.account_id}/summary`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json();
        if (!r.ok) return { ok: false, message: j.errorMessage || `HTTP ${r.status}` };
        return { ok: true, message: "Connected", details: { balance: j.account?.balance, currency: j.account?.currency } };
      }
      case "capital": {
        if (!token || !cred.account_id || !cred.encrypted_password) return { ok: false, message: "Credentials missing" };
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

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
