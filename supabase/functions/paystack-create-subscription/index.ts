import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

// Always respond 200 so the frontend sees the real error message instead of
// the generic "Edge Function returned a non-2xx status code".
function reply(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET) return reply({ success: false, error: "PAYSTACK_SECRET_KEY is not configured in Lovable Cloud secrets" });

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authErr } = await service.auth.getUser(token);
    if (authErr || !user) return reply({ success: false, error: "Unauthorized — please log in again" });

    const body = await req.json().catch(() => ({}));
    const planId = (body as any)?.planId;
    if (!planId) return reply({ success: false, error: "planId is required" });

    const { data: plan, error: planErr } = await service
      .from("subscription_plans")
      .select("id, name, price, paystack_plan_code")
      .eq("id", planId)
      .maybeSingle();
    if (planErr || !plan) return reply({ success: false, error: `Plan "${planId}" not found` });

    if (!plan.price || plan.price <= 0) {
      return reply({ success: false, error: "The free plan does not require checkout. Use the Switch to Free button." });
    }

    const callbackUrl = `${req.headers.get("origin") || ""}/settings?paystack=success`;

    // First try USD (works on USD-enabled Paystack accounts).
    const usdAmount = Math.round(Number(plan.price) * 100);
    let result = await initPaystack(PAYSTACK_SECRET, {
      email: user.email!,
      amount: usdAmount,
      currency: "USD",
      callback_url: callbackUrl,
      metadata: { user_id: user.id, plan_id: planId, plan_name: plan.name },
      plan: plan.paystack_plan_code || undefined,
    });

    // If Paystack rejects USD (most Nigerian accounts are NGN-only), retry in NGN.
    const shouldRetryAsNgn =
      !result.ok &&
      /currency|not\s+supported|invalid\s+currency|merchant/i.test(result.error || "");

    if (shouldRetryAsNgn) {
      const rate = Number(Deno.env.get("USD_NGN_RATE") || "1600");
      const ngnAmount = Math.round(Number(plan.price) * rate * 100); // kobo
      console.log(`USD rejected by Paystack, retrying with NGN at rate ${rate} → ₦${ngnAmount / 100}`);
      result = await initPaystack(PAYSTACK_SECRET, {
        email: user.email!,
        amount: ngnAmount,
        currency: "NGN",
        callback_url: callbackUrl,
        metadata: {
          user_id: user.id,
          plan_id: planId,
          plan_name: plan.name,
          usd_price: plan.price,
          conversion_rate: rate,
        },
        plan: plan.paystack_plan_code || undefined,
      });
    }

    if (!result.ok) {
      return reply({
        success: false,
        error: result.error || "Paystack initialization failed",
        paystackResponse: result.raw,
      });
    }

    return reply({
      success: true,
      authorization_url: result.authorization_url,
      reference: result.reference,
      currency: result.currency,
    });
  } catch (e) {
    console.error("paystack-create-subscription error:", e);
    return reply({ success: false, error: (e as Error).message });
  }
});

interface InitParams {
  email: string;
  amount: number;
  currency: "USD" | "NGN";
  callback_url: string;
  metadata: Record<string, unknown>;
  plan?: string;
}

async function initPaystack(secret: string, params: InitParams): Promise<{
  ok: boolean;
  authorization_url?: string;
  reference?: string;
  currency?: string;
  error?: string;
  raw?: unknown;
}> {
  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.status) {
      return { ok: false, error: j.message || `Paystack HTTP ${res.status}`, raw: j };
    }
    return {
      ok: true,
      authorization_url: j.data?.authorization_url,
      reference: j.data?.reference,
      currency: params.currency,
      raw: j,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
