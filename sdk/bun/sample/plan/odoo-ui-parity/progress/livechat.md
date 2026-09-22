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

## Bounded implementation slice: public widget session bootstrap and resume (2026-09-22)

`services/livechat/api/widget-session.yaml` and `services/livechat/pages/widget-session.yaml` add the source-backed public `/im_livechat/get_session` contract as `/livechat/widget`, joined through `livechat-widget-session`. Migration `20260922100000-052-livechat-widget-session.yaml` persists the visitor token, selected operator, durable session id, widget state, and idempotent welcome message. Repeated calls with the same token resume the active widget session; closed sessions, unavailable channels, invalid identity, and unsupported temporary mode are rejected before mutation.

Focused validation passed: 3 tests, 24 assertions; paired visitor-feedback and widget regression passed 6 tests, 44 assertions. Focused ESLint and scoped diff-check passed. Odoo `/im_livechat/support/1` returned authenticated 404 at desktop/mobile viewports; Core3 browser evidence was blocked by the local frontend 502/backend discovery failure and subsequent connection refusal. No visual-parity or full-module sign-off is claimed.

Evidence is recorded under `plan/odoo-ui-parity/evidence/livechat/2026-09-22/livechat-widget-session-001/`.

## Bounded implementation slice: public visitor message composer (2026-09-22)

`services/livechat/api/visitor-session.yaml` now exposes the
`send_livechat_visitor_message` public action at Odoo's
`/im_livechat/cors/message/post` route, while the existing visitor page binds
the action through its `livechat-visitor-session` page id. The mutation is
token-scoped, rejects invalid or closed conversations, inserts a visitor
timeline message, updates message count and row version, and uses the
existing durable message table.

Focused validation passed: 3 tests, 17 assertions. The public-message plus
visitor-feedback, widget-bootstrap, and operator-message regression passed 12
tests and 77 assertions. Odoo remains blocked by authenticated 404/no Live
Chat addon; Core3 browser evidence remains pending runtime availability. No
visual-parity sign-off is claimed.

## Bounded implementation slice: authenticated transcript email delivery (2026-09-22)

`services/livechat/api/session-detail.yaml` now exposes
`email_livechat_session_transcript` at Odoo's
`/im_livechat/email_livechat_transcript`, bound to the closed-session action
on the existing `livechat-session-detail` page. It validates the recipient,
actor, closed state, assigned-operator scope, and optimistic session version,
then inserts a durable `Queued` delivery request and refreshes the detail
projection. Migration `20260922150000-053-livechat-transcript-delivery.yaml`
is idempotent and the focused test reopens a file-backed database to verify
delivery history survives restart.

Focused validation: `bun test test/livechat_transcript_delivery.integration.test.ts --timeout 20000` — 3 passed, 20 assertions. BrowserSkill was connected to shared browser instance `245ea108`, but the authenticated Odoo tab was already borrowed by session `ftio`; no live desktop/mobile capture was possible and no visual-parity claim is made. Core3 visual evidence remains pending a runnable local runtime. The bounded Core3 contract queues delivery; no external mail transport is claimed.

## Bounded implementation slice: public transcript download (2026-09-22)

Stable feature `livechat-transcript-download-001` adds the public transcript
download surface without duplicating authenticated transcript email. Odoo's
HTTP/CORS download routes are source-traced in the focused test. Core3 adds
`livechat_public_transcript` and `download_livechat_transcript` to the existing
`livechat-visitor-session` page/API join, with visitor-token ownership and a
closed-session guard. The durable PDF artifact table is created by
`20260922190000-055-livechat-transcript-download.yaml`; two migration runs and
a file-backed restart preserve stable rows and `%PDF-1.4` bytes.

Focused validation: **3 tests, 18 assertions, 0 failures**. The paired public
visitor message, feedback/leave, widget bootstrap, transcript email, and Invite
People regression passed **18 tests, 120 assertions, 0 failures**. Focused
ESLint and `git diff --check` passed.

BrowserSkill blocker: shared browser `245ea108` was connected, but borrowing
authenticated Odoo tab `1770662590` from session `roqk` timed out during
extension confirmation. The tab was not borrowed and the session was stopped;
no desktop/mobile capture or visual-parity claim is made. Evidence is under
`plan/odoo-ui-parity/evidence/livechat/2026-09-22/livechat-transcript-download-001/`.
