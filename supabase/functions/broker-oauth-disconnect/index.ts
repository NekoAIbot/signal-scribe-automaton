// Broker OAuth — disconnect: revoke a linked broker account (or every account of a broker).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const mode = String(body.mode || "delete"); // delete | deactivate

    let query = service.from("broker_credentials").select("id, broker_type, account_id").eq("user_id", user.id);
    if (credentialId) query = query.eq("id", credentialId);
    else if (broker) query = query.eq("broker_type", broker);
    else return json({ ok: false, message: "credentialId or broker is required" }, 400);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    if (!rows?.length) return json({ ok: false, message: "No matching broker account found." }, 404);

    const ids = rows.map(r => r.id);
    if (mode === "deactivate") {
      const { error: e } = await service.from("broker_credentials")
        .update({ is_active: false, is_default: false, updated_at: new Date().toISOString() }).in("id", ids);
      if (e) throw new Error(e.message);
    } else {
      const { error: e } = await service.from("broker_credentials").delete().in("id", ids);
      if (e) throw new Error(e.message);
    }

    await service.from("broker_oauth_events").insert({
      user_id: user.id,
      broker_type: rows[0].broker_type,
      step: "disconnected",
      status: "success",
      message: `${ids.length} account(s) ${mode === "deactivate" ? "deactivated" : "disconnected"}`,
      details: { ids, accounts: rows.map(r => r.account_id) },
    });

    return json({ ok: true, disconnected: ids.length, message: `Disconnected ${ids.length} account(s).` });
  } catch (error) {
    console.error("broker-oauth-disconnect failed:", error);
    return json({ ok: false, message: (error as Error)?.message || String(error) }, 400);
  }
});
