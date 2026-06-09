import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const bodyText = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";
    const expected = await hmacSha512(PAYSTACK_SECRET, bodyText);
    if (signature !== expected) {
      console.error("Invalid paystack signature");
      return new Response("invalid signature", { status: 401, headers: corsHeaders });
    }

    const event = JSON.parse(bodyText);
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (event.event === "charge.success" || event.event === "subscription.create") {
      const meta = event.data?.metadata || {};
      const userId = meta.user_id;
      const planId = meta.plan_id;
      if (userId && planId) {
        const periodEnd = new Date(); periodEnd.setMonth(periodEnd.getMonth() + 1);
        await service.from("user_subscriptions").insert({
          user_id: userId,
          plan_id: planId,
          status: "active",
          starts_at: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          amount: (event.data?.amount || 0) / 100,
          currency: event.data?.currency || "USD",
          paystack_customer_code: event.data?.customer?.customer_code || null,
          paystack_subscription_code: event.data?.subscription_code || null,
        });
        await service.from("profiles").update({ subscription_tier: planId as any }).eq("id", userId);
        console.log(`Activated ${planId} for user ${userId}`);
      }
    } else if (event.event === "subscription.disable" || event.event === "invoice.payment_failed") {
      const customerCode = event.data?.customer?.customer_code;
      if (customerCode) {
        const { data: sub } = await service.from("user_subscriptions")
          .select("user_id").eq("paystack_customer_code", customerCode)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (sub?.user_id) {
          await service.from("user_subscriptions").update({ status: "cancelled" })
            .eq("paystack_customer_code", customerCode);
          await service.from("profiles").update({ subscription_tier: "free" as any }).eq("id", sub.user_id);
        }
      }
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (e) {
    console.error("paystack-webhook error:", e);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
});

async function hmacSha512(secret: string, payload: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}
