# livechat parity progress

Module owner: livechat module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: working
Verification trigger: feature-complete
Candidate commit: 0875bcae3d1ef2291fee5fa1842ae4ab08c44700

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
--timeout 20000` — 5 passed, 38 assertions. The full Live Chat-focused suite
passed 59 tests and 635 assertions across 18 files. The boundary test verifies
assigned list exclusion and that a forbidden close leaves status and
`row_version` unchanged; assigned detail and the other four guarded actions
remain untested. `bun run audit` and candidate diff-check passed; Live Chat test
lint passed. Repository lint is blocked by unrelated existing errors in
`sample/test/website_public.integration.test.ts:31,33`. Repository-wide
regression was interrupted (exit 130) before completion. No browser/Odoo probe,
restart persistence check, or new capture was run; authenticated desktop/mobile
actor evidence and paired Odoo comparison remain open.

## Next bounded task

Exercise the authenticated visitor/operator/manager browser matrix and restart
persistence, then continue with the next uncovered module-plan slice.
