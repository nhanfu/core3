# Time Off parity progress

Module owner: time-off module owner
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: `6300ab0a`

## Bounded draft deletion slice

Only unchanged Draft requests can be deleted from the list/detail contracts;
missing, non-Draft, stale, and repeated deletes return deterministic guards.
The candidate verifies explicit actor-role declarations and file-backed
close/reopen migration persistence. Focused regression, audit, frontend build,
and diff-check pass. No full-module parity claim is made.

## Open gates

Live Core3 HTTP binding failed; Playwright/js_repl and authenticated candidate
browser evidence are unavailable; paired Odoo desktop/mobile comparison,
repository typecheck, and local lint remain open or blocked. Full actor,
workflow/CRUD, and adapter coverage remain open.
