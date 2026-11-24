# Task roadmap

- [ ] Check current Lovable Cloud database pressure, identify likely causes from health and query metrics, and explain optimization versus instance-size cost trade-offs without changing size.
- [ ] Persist the initiating Axion AI origin with broker OAuth state and allow only approved app origins.
- [ ] Handoff the stable Deriv callback to the initiating preview or published app without exposing tokens or accepting arbitrary redirects.
- [ ] Make authentication initialization wait for the resolved session and profile, preserving the requested return location.
- [ ] Add focused tests for redirect validation, callback query preservation, and authentication initialization behavior.
- [ ] Deploy and verify the callback flow, sign-in states, automated tests, and current preview diagnostics.