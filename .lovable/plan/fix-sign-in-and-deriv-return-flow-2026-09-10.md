# Fix sign-in and Deriv return flow

## Goal
Make account sign-in work inside the Lovable preview and in normal browsers, and ensure Deriv always returns to the same current Axion AI instance where the connection started.

## Changes
- Trace and remove obsolete fixed project destinations from authentication and Deriv connection handling.
- Preserve the exact starting location through sign-in, including the full broker callback query.
- Add a safe callback handoff so a Deriv callback registered on the public Axion AI address can resume inside the current preview without loading Deriv in the embedded frame.
- Restrict callback destinations to the current Axion AI preview/public origins and validate OAuth state before completing the connection.
- Make preview authentication initialization deterministic so a valid preview session is not temporarily treated as signed out.
- Add focused tests for return-location preservation, callback handoff, invalid destinations, and authenticated broker completion.

## Verification
- Verify password sign-in from the embedded preview and from the public app.
- Start Deriv authorization from the embedded preview and confirm it opens as a true top-level page.
- Verify the callback returns to the initiating current project, completes once, and reaches Broker Accounts.
- Confirm account synchronization and broker callback logs, then check the production build and automated tests.

## Technical details
- Keep the broker-registered public callback as the stable OAuth redirect URI when required by Deriv.
- Store the initiating app origin with the server-side OAuth state; use a short-lived validated handoff rather than trusting a query-provided URL.
- Do not expose tokens or accept arbitrary redirect origins.
