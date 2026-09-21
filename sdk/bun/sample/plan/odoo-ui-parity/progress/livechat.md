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

## Bounded implementation slice: public visitor feedback and leave session (2026-09-21)

The next uncovered Odoo `im_livechat` controller pair is now represented in
Core3. `services/livechat/api/visitor-session.yaml` and
`services/livechat/pages/visitor-session.yaml` join through
`livechat-visitor-session`; the API retains `/im_livechat/feedback` and
`/im_livechat/visitor_leave_session`, while the page exposes token-scoped
visitor feedback and leave actions. Migration
`20260921120000-051-livechat-visitor-feedback.yaml` persists visitor tokens,
one feedback row per session, and the leave timeline event.

Focused validation passed: 3 tests, 21 assertions. The explicit Live Chat
corpus passed 76 tests and 762 assertions across 22 files. Audit passed with
776 pages, 785 routes, and 1,593 datasources; focused lint and diff-check
passed.

The authenticated Odoo reference remains blocked because Live Chat is shown as
`Request Access` in `/odoo/apps` and `/im_livechat/support/1` returns 404;
desktop/mobile blocker captures are recorded in the bounded evidence folder.
The attempted Core3 browser pass is also blocked by the shared local runtime:
the Vite proxy reports `EMFILE`, and a standalone backend attempt fails while
replaying `coredb/accounting.duckdb.wal` with DuckDB's missing-default-database
internal error. No Core3 visual sign-off is claimed.

## Next bounded task

Exercise the authenticated visitor/operator/manager browser matrix and restart
persistence when the reference addon and local runtime are available, then
continue with the next uncovered public-widget or transcript surface.
