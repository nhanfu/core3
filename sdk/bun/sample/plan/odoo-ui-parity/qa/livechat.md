# livechat QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/livechat-desktop.png and livechat-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable livechat assignment (pending wave dispatch)
Module owner: livechat module owner
Verification trigger: feature-complete
Candidate commit: 0875bcae3d1ef2291fee5fa1842ae4ab08c44700

Detailed execution matrix: [`test-plans/livechat.md`](test-plans/livechat.md). It is the module-level source for sessions, channels, bots, reporting, actors, persistence, Temporal, and paired Odoo gates.

## Current regression evidence

- Repository suite: `bun test ./test --timeout 20000` — 1,045 passed, 0 failed.
- Live Chat formerly failing Looking for Help and partner-history cases now
  pass in focused reruns after deterministic fixture and contract repairs.
- Focused Sessions suite: `bun test ./test/livechat_sessions.integration.test.ts` — 4 passed, 35 assertions; the lifecycle uses the Help Queue-owned `join` action and persists the session through close.
- Full Live Chat-focused suite (pre-tag baseline): `bun test ./test/livechat*.integration.test.ts --timeout 20000` — 58 passed, 632 assertions, 0 failed across 18 files.
- Isolated runner `:4327` rendered Sessions at desktop 1440x900 and mobile
  390x844, and opening seeded Visitor A loaded the Session detail side panel;
  all requests and page errors were clean with no horizontal overflow. Captures:
  `/tmp/core3-odoo-parity/livechat-sessions-desktop.png`,
  `livechat-sessions-mobile.png`, and the detail state was verified from the
  authenticated browser.

## Bounded QA execution for assigned operator scope (2026-09-13)

- Candidate checked out exactly as `0875bcae3d1ef2291fee5fa1842ae4ab08c44700`.
- Focused: `bun test ./test/livechat_sessions.integration.test.ts --timeout 20000`
  — 5 passed, 38 assertions, 0 failed.
- Full Live Chat-focused: `bun test ./test/livechat*.integration.test.ts --timeout 20000`
  — 59 passed, 635 assertions across 18 files, 0 failed.
- Repository-wide `bun test ./test --timeout 20000` was interrupted at the
  user's request with exit 130 while still running; it is incomplete and is
  not reported as a pass.
- `view_scope: assigned` list filtering was exercised: the authenticated
  `livechat-agent` projection excluded `livechat-session-scope-001`, assigned
  to `other-livechat-agent`. A cross-operator `close` returned 403 with
  `LIVECHAT_SESSION_OUTSIDE_OPERATOR_SCOPE`; the row remained `In Progress`,
  `row_version` 1. The focused test did not exercise assigned detail, or each
  of `wait`, `resume`, `help`, and `join` as cross-operator requests.
- Migration/fixture evidence is limited to the focused in-memory migration
  run and its idempotent stable second-operator fixture. No restart or
  durable on-disk reload was run.
- Audit passed: `bun run audit` reported 659 pages, 668 routes, and 1139
  datasources. Candidate `git diff --check HEAD^ HEAD` passed. Live Chat test
  lint passed: `bunx eslint sample/test/livechat_sessions.integration.test.ts`.
- Repository lint is blocked by two unrelated existing errors in
  `sample/test/website_public.integration.test.ts` lines 31 and 33
  (`no-unsafe-optional-chaining`); no Live Chat lint error was reported.
- No browser or Odoo probe was run and no new captures were produced in this
  bounded execution. Existing `/tmp/core3-odoo-parity/livechat-sessions-*.png`
  captures predate this candidate and are not candidate-specific evidence.
  Authenticated desktop/mobile actor coverage, overflow/request-error checks,
  and paired Odoo comparison remain open.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| LIVECHAT-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |
| LIVECHAT-WORKFLOW-001 | Visitor session lifecycle | Authenticated API test traverses In Progress → Waiting → In Progress → Looking for Help → In Progress → Closed, persists visitor/channel/operator/outcome and versions 1 → 6, and rejects closed-session replay | pass |
| LIVECHAT-FUNC-001 | Sessions, channels, bots, configuration, history, reporting, and technical views | Full Live Chat-focused suite 59/59, 635 assertions across 18 files | pass for tested contracts |
| LIVECHAT-BROWSER-001 | Authenticated Sessions list and detail side panel | Isolated runner `:4327`; desktop/mobile list and seeded Visitor A detail loaded without failed requests, page errors, or overflow; captures recorded above | pass for Core3 runtime; paired Odoo comparison and browser mutations remain open |
| LIVECHAT-PERM-002 | Assigned operator session list/detail and transitions | Focused test proves assigned list exclusion and cross-operator close denial with unchanged row; detail and wait/resume/help/join denial remain untested | bounded pass for tested API contract; QA open |

## R2 dispatch

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-LIVECHAT-WAVE-20260913-R2` → `QA-LIVECHAT-WAVE-20260913-R2` | existing `agent/livechat-next-wave` in `/home/nhanjs/projects/core3-worktrees/livechat-next-wave` | Assigned-operator wait/resume/help/join and session-detail permission transitions, with relation/version preservation and focused allowed/401/403/stale/missing/atomicity tests | dispatched in `8c4f7f9b`; awaiting self-contained product commit before QA |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| LIVECHAT-QA-001 | Detail side-panel form-view aliases were previously vulnerable to file-stem/page-ID mismatch | current shared alias repair | Sessions list and Visitor A detail retest passed at `:4327` with no failed requests | fixed |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off

## 2026-09-13 coordinator review: candidate `ef6d8237`

- Integrated only the bounded Live Chat session-message persistence/timeline
  slice as `002e7ab1`. The change is confined to the Live Chat detail API,
  migration, page binding, and focused test; no unrelated work was imported.
- Post-merge focused test passed: **3 tests, 15 assertions**. Candidate
  evidence remains **62 tests, 650 assertions**; audit (**661 pages, 670
  routes, 1154 datasources**), Live Chat Sass, Vite/frontend build, ESLint,
  and diff-check passed.
- Persisted fixtures, migration replay, timeline ordering, composer send,
  operator scope, validation, message count, and row-version behavior are
  accepted for this bounded slice.
- Live Chat remains **conditional / unsigned-off**. Authenticated browser
  composer/denial and visual evidence, durable restart persistence, and paired
  authenticated Odoo comparison remain blocked by unavailable Playwright/
  session, stopped Core3, and unauthenticated Odoo.

## 2026-09-20 bounded review: operator conversation tags

- Implemented only the Live Chat session-detail conversation tag workflow. The
  allowed file surface is limited to `services/livechat/**`,
  `test/livechat*.ts`, and Live Chat plan/QA files.
- Focused validation: `bun test test/livechat_session_tags.integration.test.ts`
  — 4 passed, 28 assertions; it covers idempotent migration, selected tag
  projections, ADD/DELETE persistence, assigned-operator denial, stale and
  missing guards, and file-backed restart replay.
- Existing session regressions plus the new slice:
  `bun test test/livechat_session_tags.integration.test.ts
  test/livechat_session_messages.integration.test.ts
  test/livechat_sessions.integration.test.ts --timeout 20000` — 17 passed,
  127 assertions, 0 failed.
- Full current Live Chat corpus: `bun test test/livechat*.integration.test.ts
  --timeout 20000` — 73 passed, 0 failed across 21 files.
- No authenticated browser or paired Odoo visual evidence is claimed for this
  API-bound slice. Full Live Chat sign-off remains open.

## 2026-09-21 bounded review: public visitor feedback and leave session

- Focused: `bun test test/livechat_visitor_feedback.integration.test.ts --timeout 20000` — **3 passed, 21 assertions, 0 failed**. It covers Odoo route tracing, matching page/API IDs, token ownership, rating validation/upsert, leave-state guards, idempotent migration replay, and file-backed restart recovery.
- Full explicit Live Chat corpus: **76 passed, 762 assertions, 0 failed across 22 files**.
- UI audit: `bun run audit` — **776 pages, 785 routes, 1,593 datasources**, passed.
- Focused lint: `bunx eslint test/livechat_visitor_feedback.integration.test.ts` — passed. `git diff --check` — passed.
- Odoo browser evidence is a blocker, not a sign-off: authenticated `/odoo/apps` shows Live Chat as `Request Access`, and authenticated `/im_livechat/support/1` returns Odoo 404 at both captured desktop/mobile states. Captures are recorded outside Git under `/tmp/odoo-livechat-visitor-feedback-*20260921.png`.
- Core3 authenticated visitor desktop/mobile evidence remains pending because the local Core3 runtime/browser pass was not available in this execution. Functional parity and full-module sign-off remain open.
