import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET) throw new Error("PAYSTACK_SECRET_KEY is not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authErr } = await service.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    const { planId } = await req.json();
    if (!planId) throw new Error("planId required");

    const { data: plan, error: planErr } = await service.from("subscription_plans")
      .select("id, name, price, paystack_plan_code, currency:interval")
      .eq("id", planId).maybeSingle();
    if (planErr || !plan) throw new Error("Plan not found");
    if (!plan.price || plan.price <= 0) throw new Error("Free plan does not require checkout");

    // Use USD price → convert to NGN cents not needed; Paystack accepts USD if account enabled, fallback to amount in lowest unit
    const amount = Math.round(Number(plan.price) * 100);
    const callbackUrl = `${req.headers.get("origin") || ""}/settings?paystack=success`;

    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        amount,
        currency: "USD",
        callback_url: callbackUrl,
        metadata: { user_id: user.id, plan_id: planId, plan_name: plan.name },
        plan: plan.paystack_plan_code || undefined,
      }),
    });
    const j = await initRes.json();
    if (!initRes.ok || !j.status) throw new Error(j.message || "Paystack init failed");

    return json({ authorization_url: j.data.authorization_url, reference: j.data.reference });
  } catch (e) {
    console.error("paystack-create-subscription error:", e);
    return json({ error: (e as Error).message }, 400);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
