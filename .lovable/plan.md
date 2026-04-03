

# Plan: Fix Trade Execution, Real-time Monitoring, and Full Mobile Responsiveness

## Problem Summary

Three categories of issues to address:

1. **Trade execution failures** -- Both automatic (bot) and manual (button click) execution paths have issues with MetaApi authentication, broker credential handling, and signal status tracking.
2. **Monitoring not showing real-time data** -- The trades table has realtime enabled but the `executeOnBroker` function doesn't properly update signal status on failure, and the `useTradingSignals` hook maps all signals to `status: 'new'` regardless of actual state.
3. **Mobile usability** -- Several pages (Settings, Admin, Signals, News, Prop Accounts, Monitoring) have hardcoded widths, multi-column tab lists, and non-responsive grids that break at 360-412px viewports.

---

## Step 1: Fix Trade Execution Pipeline

**Edge function `execute-trade`:**
- Sanitize `METAAPI_TOKEN` (trim whitespace/newlines) before use
- Add `cloud-g2` to provisioning payload (`provisioningProfileId: 'cloud-g2'`)  
- Use region-aware trade URL: try `mt-client-api-v1.new-york.agiliumtrade.ai` with fallback to default
- Add better error logging with token prefix for debugging
- Handle MetaApi `_id` vs `id` field inconsistency in account objects

**Client-side signal execution (`TradingSignals.tsx`):**
- After execution, update the signal's `is_active` to `false` in `trading_signals` table so it doesn't show as executable again
- Show proper error details from the edge function response

**Automatic execution (`unifiedSignalService.ts`):**
- In `executeOnBroker`, set `signal.status = 'failed'` when all accounts fail (currently only sets `'executed'`)
- Add the user's auth token check before attempting broker queries (RLS requires auth)

## Step 2: Fix Signal Status Tracking

**`marketDataService.ts` `useTradingSignals`:**
- Currently hardcodes `status: 'new'` for all signals. Add a `status` column to `trading_signals` table or track executed state via the `trades` table join.
- Quick fix: check if a matching trade exists in the `trades` table for the signal; if so, mark as `'executed'`.

**Database migration:**
- Add `status` column to `trading_signals` table: `text DEFAULT 'new'` with values `new`, `executing`, `executed`, `failed`
- Add UPDATE RLS policy for `trading_signals` so users can update their own signals

## Step 3: Real-time Monitoring Improvements

**`useLiveTrades.ts`:**
- Already correctly subscribes to realtime changes -- this works once trades are actually inserted by the edge function
- No changes needed here; fixing Step 1 will make trades appear

**`MonitoringPage.tsx`:**
- Add a connection status indicator showing whether realtime subscription is active
- Add auto-refresh on page focus

## Step 4: Full Mobile Responsiveness (360px)

Files requiring mobile fixes:

| Page | Issues |
|------|--------|
| **SettingsPage** | `grid-cols-4` TabsList overflows at 360px; `max-w-5xl` wastes space on mobile |
| **AdminPage** | Tab bar overflows; strategy/model cards not stacking; action buttons wrap poorly |
| **SignalsPage** | Signal cards have fixed-width elements; search bar doesn't resize |
| **MonitoringPage** | Already mostly responsive but header flex needs `flex-col` on mobile |
| **ForexNewsPage** | Search input and cards OK but article text may clip |
| **PropAccountsPage** | Dialog forms need `max-w-[95vw]`; card grid needs single-column on mobile |
| **AlertsPage** | Form fields may overflow; alert cards need responsive layout |
| **AnalyticsPage** | Chart containers need `min-h` and `overflow-x-auto`; stat grids need `grid-cols-2` on mobile |

**Specific fixes per page:**
- **SettingsPage**: Change `grid-cols-4` to `grid-cols-2 sm:grid-cols-4` on TabsList; remove `max-w-5xl` container constraint on mobile
- **AdminPage**: Make TabsList scrollable horizontally with `overflow-x-auto` or use `grid-cols-2 sm:grid-cols-4`; ensure action button groups use `flex-wrap`
- **SignalsPage**: Signal detail cards stack vertically; price/action row uses `flex-col` on small screens
- **PropAccountsPage**: Dialog uses `max-w-[95vw] sm:max-w-lg`; account cards single-column
- **All pages**: Ensure no horizontal scroll at 360px; headers use `flex-col` with `gap-2` on mobile

## Step 5: Deploy and Verify

- Deploy updated `execute-trade` edge function
- Run the migration for `trading_signals.status` column
- Test manual signal execution from Signals page
- Test automatic execution by starting bot with active broker account
- Verify trades appear in Monitoring page via realtime subscription
- Verify all pages render correctly at 360px viewport

---

## Files to Modify

1. `supabase/functions/execute-trade/index.ts` -- MetaApi fixes
2. `src/services/unifiedSignalService.ts` -- Failed status tracking, auth check
3. `src/components/dashboard/TradingSignals.tsx` -- Post-execution status update
4. `src/services/marketDataService.ts` -- Signal status from DB
5. `src/pages/MonitoringPage.tsx` -- Connection indicator
6. `src/pages/SettingsPage.tsx` -- Mobile tabs
7. `src/pages/AdminPage.tsx` -- Mobile tabs and cards
8. `src/pages/SignalsPage.tsx` -- Mobile signal cards
9. `src/pages/PropAccountsPage.tsx` -- Mobile dialogs
10. `src/pages/AlertsPage.tsx` -- Mobile form layout
11. `src/pages/AnalyticsPage.tsx` -- Mobile charts
12. `src/pages/ForexNewsPage.tsx` -- Mobile text wrapping
13. New migration: Add `status` column + UPDATE policy to `trading_signals`

