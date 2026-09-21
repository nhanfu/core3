# Functionality checklist

- [x] Add durable time-limit fields to the authenticated Survey detail
  datasource and Time & Scoring group.
- [x] Add a separate API-owned server form with exact checkbox/minutes fields.
- [x] Require `surveys.write` and an authenticated actor.
- [x] Reject missing, archived, stale, zero, negative, and non-numeric enabled
  durations before mutation.
- [x] Permit disabling the timer without changing the public token contract.
- [x] Preserve settings and row version through file-backed DuckDB reopen and
  migration replay.
- [x] Confirm the public detail operation projects the same values used by the
  existing expiry guard.
- [x] Capture authenticated Odoo desktop and mobile-emulation reference
  states.
- [ ] Capture paired authenticated Core3 desktop/mobile states: blocked by the
  shared page-discovery error before a listener was available.

