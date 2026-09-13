# livechat parity progress

Module owner: livechat module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: working
Verification trigger: feature-complete
Candidate commit: 61296530

## Current state

This module is registered in odoo-parity-plan.md and is being delivered in
isolated, reviewable slices. No full parity claim is made here.

## Bounded implementation slice: assigned operator session scope (2026-09-13)

Live Chat session list/detail sources now honor `view_scope: assigned` by
matching `operator_id` to the authenticated operator. Session wait, resume,
help, join, and close transitions reject another operator's session with
`LIVECHAT_SESSION_OUTSIDE_OPERATOR_SCOPE` before mutation. Migration
`20260913200000-023-livechat-operator-scope.yaml` adds the durable operator
identity and a stable second-operator fixture.

Focused validation: `bun test ./test/livechat_sessions.integration.test.ts
--timeout 20000` — 5 passed, 38 assertions. The boundary test verifies the
assigned list projection and that a forbidden close leaves status and
`row_version` unchanged. Audit, lint, and diff-check are run for the candidate
below. Browser actor-matrix and restart evidence remain open.

## Next bounded task

Exercise the authenticated visitor/operator/manager browser matrix and restart
persistence, then continue with the next uncovered module-plan slice.
