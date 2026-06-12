
# Plan: Fix Subscribe Error + Remove MetaApi

Two focused fixes. No new features.

---

## 1. Fix the Paystack "2xx edge function" subscribe error

### What's actually happening
`paystack-create-subscription` returns **HTTP 400** (which `supabase.functions.invoke` reports as the "non-2xx" error you're seeing). The error message is being swallowed by the frontend. Two likely root causes:

- Paystack rejects `currency: "USD"` because most Nigerian Paystack accounts are NGN-only.
- The frontend logs `e.message` which becomes the generic "Edge Function returned a non-2xx status code" string instead of the real reason.

### Changes

**`supabase/functions/paystack-create-subscription/index.ts`**
- Try `currency: "USD"` first; on Paystack failure that mentions currency, automatically retry with `currency: "NGN"` and amount converted at a configurable rate (default 1600 NGN/USD via new optional secret `USD_NGN_RATE`).
- Always return errors as **HTTP 200** with `{ success: false, error, paystackResponse }` so the frontend sees the real reason instead of a generic non-2xx error.
- Add explicit handling for the "free plan" case → return a friendly message, not 400.

**`src/services/edgeFunctionService.ts`** (already does direct fetch — good)
- No changes needed; it already extracts `data.error`.

**`src/components/settings/SubscriptionPlans.tsx`**
- Switch from `supabase.functions.invoke` to `invokeEdgeFunction` so the real Paystack message ("Currency not supported", "Invalid plan code", etc.) is shown in the toast.

### Result
You'll either get a working checkout, or a toast that tells you exactly what Paystack is complaining about so we can fix it in one more turn.

---

## 2. Remove MetaApi entirely from the execution path

### What's actually happening
Every trade is failing with MetaApi `403 ForbiddenError: "To allow high reliability please top up your account"`. This is a billing problem on the MetaApi side — no code change fixes it. Per your choice, we drop MetaApi entirely.

### Changes

**`supabase/functions/execute-trade/index.ts`**
- Delete the `else if (METAAPI_TOKEN)` branch (lines 183–199) and the `executeViaMetaApi` / `normalizeMetaApiToken` / MetaApi provisioning helpers (lines ~372–600).
- Update the broker-type router so when `broker_type` is `mt4`/`mt5`/`metatrader`, the function now returns a clear `success: false` error:
  > "MetaTrader execution has been disabled. Add a Deriv, Binance, OANDA, or Capital.com account in Settings → Brokers to continue trading."
- Keep the MT5 bridge branch as-is (it only runs if `MT5_BRIDGE_URL` is set, which it isn't — harmless).
- Update the final "no broker route" error message to drop the MetaApi mention.

**`supabase/functions/run-trading-bot/index.ts`**
- When iterating users, skip (with a logged reason) any user whose only broker account is an MT4/MT5 type. Prevents wasted bot cycles.

**`src/components/settings/MT5AccountSettings.tsx`** (UI hint only)
- In the broker picker, mark `MT4 / MT5` as "Disabled — choose Deriv/Binance/OANDA/Capital.com" so users can't add a doomed account.
- Existing MT5 rows show a warning badge: "Not executable — switch to a supported broker."

**Secrets**
- `METAAPI_TOKEN` is left in place (harmless) — no deletion to avoid breaking anything else that references it. Code paths that read it are removed.

### Result
Trades now route only through the four direct-API brokers that actually work. MetaApi 403 errors disappear from logs.

---

## Files touched

```text
supabase/functions/paystack-create-subscription/index.ts   (rewrite error handling + NGN fallback)
supabase/functions/execute-trade/index.ts                  (remove MetaApi branch + helpers)
supabase/functions/run-trading-bot/index.ts                (skip MT4/MT5-only users)
src/components/settings/SubscriptionPlans.tsx              (use invokeEdgeFunction for real errors)
src/components/settings/MT5AccountSettings.tsx             (disable MT4/MT5 picker, warn existing)
```

No DB migrations. No new secrets required (USD_NGN_RATE is optional).

---

## What this does NOT do

- Does not build the Telegram copytrader (you chose to skip).
- Does not delete MetaApi-related DB columns or secrets — purely a code-path removal so it's reversible.
- Does not change subscription tiers, broker adapters, or webhook handling.
