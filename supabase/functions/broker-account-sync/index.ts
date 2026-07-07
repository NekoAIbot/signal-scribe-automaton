import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Not authenticated");

    const service = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { credentialId, selectedAccount } = await req.json();
    const { data: credential, error } = await service.from("broker_credentials").select("*").eq("id", credentialId).eq("user_id", user.id).single();
    if (error || !credential) throw new Error("Broker credential not found");

    const metadata = { ...(credential.metadata || {}), active_account: selectedAccount || null, account_sync: { synced_at: new Date().toISOString(), status: "synced" }, heartbeat: { status: "online", checked_at: new Date().toISOString() } };
    const updates = {
      account_id: selectedAccount?.accountId || credential.account_id,
      account_name: selectedAccount?.accountName || credential.account_name,
      account_type: selectedAccount?.accountType || credential.account_type,
      environment: selectedAccount?.environment || credential.environment,
      login: selectedAccount?.accountNumber || selectedAccount?.accountId || credential.login,
      metadata,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await service.from("broker_credentials").update(updates).eq("id", credentialId).eq("user_id", user.id);
    if (updateError) throw updateError;
    return json({ ok: true, message: "Broker account synchronized", metadata });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Broker account sync failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
