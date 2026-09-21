# surveys QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/surveys-desktop.png and surveys-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: bounded migration-repair candidate QA
Module owner: surveys module owner
Verification trigger: feature-complete
Candidate commit: `f7b9a24e7100e0821688ef006dec187212bb36de`

## Bounded QA rerun: candidate f7b9a24e (2026-09-13)

- Migration matrix: **pass** on fresh in-memory DuckDB. Latest `0.0.17` applied all 17 migrations and exposed `survey_responses_access_token_idx`, `survey_responses_survey_idx`, and `survey_responses_idempotency_key_idx`. A submitted `qa-preserved` response survived rollback to `0.0.16`; the two earlier indexes remained. Upgrade plus two replays restored the idempotency index, retained the response, and retained 17 migration rows. The candidate migration tests passed 2/2.
- Migration error probe: requesting nonexistent target `9.9.9` returned success/no-op and left the schema/data unchanged. This is a migration-runner behavior finding, not a candidate sign-off criterion; it should be fixed or explicitly specified separately.
- Focused Surveys tests: **33 pass, 3 fail, 292 assertions** across 36 tests. Failures in `surveys.integration.test.ts`, `surveys_delete.integration.test.ts`, and `surveys_invite.integration.test.ts` all fail discovery on `components[0].activity_complete_action is not allowed`; the key is in Maintenance, not Surveys, and is unchanged by `f7b9a24e`.
- Audit: **fail**, same `activity_complete_action` schema error. Scoped `git diff --check` passed.
- Full repository test: started, then stopped on request while still running. It had reached an unrelated `sales_orders_to_upsell` timeout at 30,000 ms and later continued; no full-suite result is claimed. Surveys migration tests passed when reached.
- Browser evidence: fresh module process on `http://127.0.0.1:4047` served public `/surveys` HTML with 200 and authenticated login succeeded. Headless Chrome authenticated desktop 1440x900 and mobile 390x844 navigated to `/surveys`, with zero page errors, zero failed requests, and no horizontal overflow; both rendered an empty body, so no desktop/mobile visual or Odoo parity claim is made. Captures: `/tmp/core3-qa-surveys-f7b9-desktop.png`, `/tmp/core3-qa-surveys-f7b9-mobile.png`.

Decision: **blocked / not signed off**. The migration repair itself passes the requested rollback, dependent-index, preservation, upgrade, and replay checks. Open blockers are the unrelated schema/audit failures, incomplete full repository regression, empty authenticated browser render, and no paired Odoo evidence.

## Test-case inventory

## Current regression evidence

- Candidate-bounded QA: `bun test ./test/surveys*.integration.test.ts --timeout 20000` — **34 passed, 0 failed, 305 assertions across 5 files**.
- Forward durable migration replay passed on fresh DuckDB: applying all 17 migrations twice left 17 migration rows, 5 seeded response rows, and one `idempotency_key` column on both runs (`stable: true`). Full-chain rollback to `0.0.16` is blocked on DuckDB with `Dependency Error: Cannot alter entry "survey_responses" because there are entries that depend on it.`
- Fresh module process `http://127.0.0.1:4035`: public start and authenticated `/surveys` passed at 1440x900 and 390x844 with no page/request errors or horizontal overflow. Captures: `/tmp/core3-qa-surveys-public-start-desktop.png`, `/tmp/core3-qa-surveys-public-start-mobile.png`, `/tmp/core3-qa-surveys-auth-desktop.png`, `/tmp/core3-qa-surveys-auth-mobile.png`.
- Fresh public API checks: keyed start retry returned 200 and the same response ID; missing required answers returned 422 without mutation; keyed submit and retry returned 200, `Submitted`, and the same response ID. Focused assertions verified one response row and one response-count increment.
- Permission/token checks: Fleet received 403 from `/api/pages/surveys?lc=en` with `Requires permission: surveys.read`; invalid public API token returned 404 `Survey is unavailable` with no disclosure. `bun run audit` passed (659 pages, 668 routes, 1,139 datasources); scoped `git diff --check` passed.
- Full repository regression `bun test ./test --timeout 20000` was started but interrupted at the user's request while still running; it is not a completed full-suite pass.

- Public response retry/idempotency follow-up: `surveys_public_response.integration.test.ts` verifies repeated start with the same key returns the original answer, repeated submit with the same key returns 200, and the response row/count remain single-write; migration `0.0.17` adds a durable unique key.

- Focused Surveys suite: `bun test ./test/surveys*.integration.test.ts --timeout 20000` — 34 passed, 0 failed, 305 assertions across 5 files.
- Module-scoped authenticated route matrix on the developer process (`bun run agent:module -- surveys --port=4010`): 14 routes × desktop/mobile = 28/28 passed, with no blank page, browser error, HTTP error, or horizontal overflow.
- Fleet user permission boundary: `/surveys` returned HTTP 403 with `Requires permission: surveys.read`, with no browser errors.
- Authenticated lifecycle persistence on the module-scoped process: created a survey and question, then Draft → Published → Closed → Archived → Draft; all responses returned 200 and the survey row version advanced `1 → 5`.
- The pre-existing shared process on port 3002 returned `Unknown page` for the same routes; the module-scoped process loaded them successfully. This is recorded as a process freshness/integration follow-up, not as a Surveys implementation failure.
- Current module-scoped rerun on port 4034 checked all 14 registered Surveys
  routes at desktop/mobile: 28/28 passed with no page errors, failed requests,
  HTTP errors, redirect/blank states, or horizontal overflow.
- Authenticated mobile Close action on `survey-demo-feedback` returned 200,
  changed the visible action set, and persisted `Closed` after reload.
- The detailed module plan is approved at `qa/test-plans/surveys.md`.
- Public participant response workflow: fresh database/API-handler test starts a token response, rejects missing required answers without mutation, saves answer progress, submits respondent identity/answers, increments the survey response count, and rejects duplicate submission with 409.

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| SURVEYS-FUNC-001 | Focused functionality, CRUD, workflow, invitation, print, and delete contracts | 34 tests, 305 assertions; focused suite passed | pass |
| SURVEYS-BROWSER-001 | Authenticated registered-menu route matrix | 14 routes × desktop/mobile = 28/28 on module-scoped process | pass |
| SURVEYS-PERM-001 | Non-member cannot read Surveys | Fleet user received HTTP 403 with `Requires permission: surveys.read`; browser errors 0 | pass |
| SURVEYS-WORKFLOW-001 | Survey create, question persistence, and lifecycle transitions | Authenticated create/question plus Draft → Published → Closed → Archived → Draft returned 200; row version 1 → 5 | pass |
| SURVEYS-WORKFLOW-002 | Public token response lifecycle | `surveys_public_response.integration.test.ts` rejects missing required answers without mutation, persists start/progress/submit and respondent data, increments response count, and returns 409 for duplicate submit | pass |
| SURVEYS-RUNTIME-001 | Shared-process registration freshness | Shared port 3002 returned page 404s while fresh module process on 4010 passed 28/28 | follow-up |
| SURVEYS-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Focused contracts, lifecycle/permission evidence, current 14-route matrix, and mobile Close persistence are recorded; paired Odoo comparison and broader public/actor coverage remain open | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| SURVEYS-RUNTIME-001 | Shared process was stale and did not serve registered Surveys pages | — | Fresh module-scoped process served all 28 checks; shared-process restart/retest remains required | follow-up |
| SURVEYS-MIGRATION-001 | DuckDB full-chain rollback to `0.0.16` previously failed because dependent entries prevented altering `survey_responses` | `5b7dd7e5` | Active checkout retest passed full-chain rollback to `0.0.0`/re-upgrade and preserved five indexes | fixed |

## Sign-off

- Functional: partial pass (focused suite passed)
- Permissions: partial pass (read boundary passed; mutation-role matrix remains)
- Persistence/data integrity: partial pass (authenticated Close persistence and contract tests pass; restart coverage remains)
- Desktop/mobile visual parity: current route smoke pass; paired comparison pending
- Tester decision: bounded candidate QA recorded; not signed off. Full regression, rollback/replay-down, complete actor mutation matrix, and full paired Odoo visual comparison remain open.

## Wave 24 — token-only public access (`SURVEYS-PUBLIC-TOKEN-ACCESS-001`)

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| SURVEYS-FUNC-022 | Token-only survey requires a matching durable answer token | `surveys_public_token_access.integration.test.ts` — 3 tests / 25 assertions | pass |
| SURVEYS-WF-019 | Answer token begins once, converges under concurrent start, and resumes after file-backed reopen | same focused test; deterministic `token-access-answer-2026` fixture | pass |
| SURVEYS-PERM-021 | `surveys.public` plus missing/wrong token no-disclosure boundary | paired API guard and route assertions | pass |
| SURVEYS-UI-020 | Public token-only route at desktop/mobile and paired Odoo comparison | `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-TOKEN-ACCESS-001/` | conditional |

Wave 24 focused and public/catalog regressions pass (**94 tests / 882
assertions**); audit, scoped lint, and diff-check pass. The runtime's backend
returned `401 Unauthorized` before the public renderer loaded, so the Core3
screenshots are recorded as blocked rather than authenticated visual evidence.
Odoo 8069 redirected the synthetic token route to `/` and port 8072 refused;
there is no authenticated installed Surveys reference fixture. No sign-off is
claimed.

## Reviewer disposition — candidate `78a4142f`

- Integrated on the active branch as `5b7dd7e5`; scope is limited to Surveys
  migration rollback/replay fixes, dependency preservation, deterministic data,
  and the migration regression test.
- Post-merge verification passed the migration suite (3 tests / 11 assertions),
  UI audit (661 pages / 670 routes / 1153 datasources), Surveys Sass build,
  and `git diff --check`.
- Authenticated persistence/actor/browser evidence and paired Odoo comparison
  remain open. Surveys remains conditional and unsigned-off.

## DEV/QA reconciliation — `DEV-SURVEYS-WAVE-20260913-R2` / `QA-SURVEYS-WAVE-20260913-R2`

- The owner handoff at `6b704c7d` requested the migration repair, but the
  authoritative active branch already contains the self-contained product
  candidate `5b7dd7e5` (`fix(surveys): make DuckDB rollback chain replayable`).
  No duplicate owner implementation commit is required.
- Candidate scope review: exactly four Surveys-owned files — migrations `005`,
  `009`, `015`, and `test/surveys_migrations.integration.test.ts`; no
  aggregate progress or unrelated module files are included.
- QA event triggered/reconciled against `5b7dd7e5`. Active-checkout command
  `bun test test/surveys_migrations.integration.test.ts` passed **3 tests / 11
  assertions**, including complete DuckDB chain rollback and re-upgrade with
  index preservation. Existing audit, Surveys Sass build, and diff-check
  evidence also passed.
- Disposition: **bounded QA pass; integrated candidate accepted**. Broader
  Surveys status remains conditional/unsigned-off: authenticated actor and
  restart coverage, paired Odoo comparison, and the unrelated schema/audit
  and full-regression gates remain open.
## 2026-09-13 coordinator dispatch — bounded repair wave

- Existing owner `agent/odoo-ui-surveys-next-wave-current` is assigned on
  `/home/nhanjs/projects/core3-worktrees/surveys-next-wave`, based at
  `78a4142f`. Development event: `DEV-SURVEYS-WAVE-20260913-R2`; QA event:
  `QA-SURVEYS-WAVE-20260913-R2`; handoff commit: `6b704c7d`.
- Target is the bounded `SURVEYS-MIGRATION-001` rollback/replay-down repair
  with focused regression tests. Candidate is pending; aggregate progress is
  untouched. Existing ledger edits in the owner worktree are preserved.

## 2026-09-13 R2 coordinator dispatch

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-SURVEYS-WAVE-20260913-R2` → `QA-SURVEYS-WAVE-20260913-R2` | existing `agent/odoo-ui-surveys-next-wave-current` in `/home/nhanjs/projects/core3-worktrees/surveys-next-wave` | Published/token-scoped participant start/progress/submit/print boundaries, invalid/expired and duplicate/stale refusal, and focused no-disclosure/no-mutation tests | dispatched in `3951d9ea`; awaiting self-contained product commit before QA |

## Bounded QA run: live-session current-question results (2026-09-20)

- Source trace: Odoo 19 `addons/survey/controllers/survey_session_manage.py`
  `survey_session_results` scopes statistics to the in-progress session's
  current question. Core3 implements that host-results contract in the
  page/API pair `survey-live-session-results` and links it from the existing
  live-session manager with `surveys.manage`.
- Focused implementation test: **2 passed, 16 assertions** in
  `test/surveys_live_results.integration.test.ts`. It verifies the page/API
  join, permission declarations, deterministic attendee/answer persistence,
  choice aggregation, empty/transport-error states, and closed-session guard.
- Migration regression subset: **5 passed, 27 assertions**, including replay
  of the new `0.0.18` migration and the existing rollback/full-chain checks.
- Lint and scoped diff check: **pass** (`bunx eslint
  test/surveys_live_results.integration.test.ts`; `git diff --check`).
- Full Surveys glob: **36 passed, 5 failed, 330 assertions**. The five
  failures are the unchanged repository-wide Inventory discovery error
  (`back_to_inventory_package` duplicate action and illegal `label`), not
  Surveys files.
- UI audit: **not passed** for the same unrelated Inventory schema error;
  no browser visual claim is made for this backend/page-contract slice.

Disposition: bounded live-results contract passes; broader Surveys sign-off
remains conditional. Public session joining, leaderboard, attendee answer
submission, actor mutation matrix, and paired Odoo desktop/mobile evidence
remain open.

## Bounded QA run: Questions-tab Add a question (2026-09-20)

- Source/action trace: Odoo `survey_survey_views.xml` Questions-tab
  `question_page_one2many` control `add_question_control`; Core3 page/API
  contracts are `survey-detail` plus `surveys.questions.create_inline`.
- Focused implementation test: **3 passed, 17 assertions** in
  `test/surveys_question_create.integration.test.ts`. Coverage includes the
  page/API join, `surveys.write` boundary declaration, deterministic ordered
  insert, blank/type/stale/archive refusal, and file-backed restart reload.
- Authenticated Core3 browser evidence: desktop 1440x1000 and mobile 390x844
  successfully created and rendered appended question rows with zero page
  errors, zero failed requests, and no horizontal overflow. Evidence is in
  `plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-QUESTION-CREATE-001/`.
- Authenticated Odoo browser evidence: `codex@core3.local` reached the live
  database, but its Surveys addon is uninstalled; `/odoo/surveys` redirected
  to Discuss. The desktop/mobile fallback captures and this limitation are
  recorded in the feature's `source-comparison.md`; no Odoo visual parity
  claim is made.
- Scoped lint and diff-check: pass (`bunx eslint
  test/surveys_question_create.integration.test.ts`; `git diff --check`).
- Repository audit: run separately; any failure is reported without staging
  or modifying other module owners' files.

Disposition: bounded Add-a-question lifecycle passes its service, persistence,
permission-contract, and Core3 responsive evidence checks. Surveys remains
conditional and unsigned-off pending the broader actor matrix, public flows,
restart coverage across all workflows, and an installed Odoo paired visual
reference.

## Bounded QA run: DuckDB dependent-response rollback (2026-09-20)

- Focused migration regression: **4 passed, 15 assertions**. The new case
  inserts a response with a populated access token, rolls back `0.0.17` to
  `0.0.16`, checks the row and both dependent indexes, then replays the chain
  and checks the row again.
- Full Surveys glob: **45 passed, 0 failed, 374 assertions** across 8 files.
- Full repository regression: **1,379 passed, 3 failed, 12,601 assertions**.
  The failures are outside Surveys: two CRM deterministic-order expectations
  received concurrent `crm-team-opportunity-*` rows, and Ecommerce Products
  received the concurrent `Product Tags` menu item. No Surveys failure was
  observed.
- Authenticated actor evidence: Core3 Admin loaded Survey detail at desktop
  1440x1000 and mobile 390x844 with zero page/request errors and no overflow;
  Fleet received HTTP 403 and `Requires permission: surveys.read` for
  `/surveys`.
- Authenticated Odoo evidence: `codex@core3.local` authenticated at desktop
  and mobile, but the live database has Surveys uninstalled and redirected
  `/odoo/surveys` to Discuss. Captures and the exact limitation are in the
  feature evidence directory; no paired Odoo visual claim is made.
- Evidence inventory and source comparison:
  `plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-MIGRATION-ROLLBACK-001/`.

Disposition: the previously reported DuckDB dependent-entry blocker is
verified repaired and now has a focused regression guard. Surveys remains
conditional pending an installed Odoo visual reference and wider module
acceptance/actor coverage; repository-wide red is attributable to other
owners' concurrent CRM/Ecommerce changes.

## Bounded QA run: Authenticated actor mutation matrix — `SURVEYS-ACTOR-MATRIX-001`

- Core3 source/action trace: Odoo's Survey form Questions-tab mutation is
  represented by the `survey-detail` page and its separate
  `surveys.questions.create_inline` API action, guarded by `surveys.write`.
- Fresh authenticated Core3 browser probes passed for Administrator desktop
  1440x1000 and mobile 390x844. A question created on desktop persisted and
  rendered at sequence 8; the mobile mutation persisted and rendered at
  sequence 9. Both probes recorded zero page errors, failed requests, HTTP
  errors, and horizontal overflow.
- Fleet mobile `/surveys` returned HTTP 403 with
  `Requires permission: surveys.read`; anonymous mobile navigation redirected
  to `/auth/login?redirect=%2Fsurveys`. These boundaries disclosed no Survey
  data.
- Focused Surveys verification remains green: the current full Surveys glob
  is **45 passed, 0 failed, 374 assertions** across 8 files, and the migration
  rollback/replay subset is **4 passed, 15 assertions**. Scoped ESLint and
  `git diff --check` are run for the owned changes below.
- The full repository regression completed with **1,330 passed, 66 failed,
  12,103 assertions** across 1,396 tests in 420 files. The failures are
  dominated by concurrent page definitions failing discovery because filter
  options use disallowed `value` fields and missing string `id`s, plus shared
  Inventory migrations failing DuckDB with `Adding columns with constraints
  not yet supported`; concurrent CRM fixture-order expectations also remain
  red. `Surveys Delete action parity` appears in the full-run red list because
  it encountered the shared discovery failure, but the isolated Surveys glob
  is green and no Surveys-owned failure reproduced in the focused run.
- Authenticated Odoo desktop/mobile probes reached the local server, but the
  reference `core3_reference` database has Surveys uninstalled and
  `/odoo/surveys` redirected to Discuss. `odoo-desktop-fallback.png` and
  `odoo-mobile-fallback.png` are retained as exact blocker evidence; no paired
  Odoo Survey visual sign-off is claimed.

Disposition: Core3 actor mutation/read boundaries and responsive evidence pass
for this bounded slice. Surveys remains **qa-in-progress / conditional** and
unsigned-off pending an installed Odoo Survey reference plus broader public and
participant acceptance coverage.

## Bounded QA run: Participant invitation/resend — `SURVEYS-PARTICIPANT-INVITE-001`

- Source comparison: Odoo's participant form exposes `Resend Invitation` for
  non-completed participants, and `survey_user_input.action_resend` invokes the
  invitation composer in resend mode. Core3 separates the participants page
  from its API actions and protects send/resend with `surveys.write`.
- Focused verification: **49 passed, 0 failed, 395 assertions** across the
  Surveys integration glob; scoped ESLint passed; `bun run audit` passed with
  **671 pages, 680 routes, and 1,216 datasources**; `git diff --check` is clean.
- Persistence/workflow: New → Sent and In Progress → Sent transitions persist
  invitation counts and deterministic timestamps. Missing email, completed
  state, stale replay, Fleet permission denial, and anonymous login boundary
  cases are covered; file-backed DuckDB reopen proves restart durability.
- Browser evidence: authenticated Admin desktop and mobile mutation captures,
  Fleet denial, and anonymous redirect are in the feature evidence directory.
  Both Core3 viewports report no horizontal overflow or request/page errors.
- Odoo comparison: the current authenticated `core3_reference` probe found the
  Surveys addon installed (not uninstalled), but `/odoo/action-241` contains
  only Completed participant fixtures. No New/In Progress row is available to
  expose or mutate the resend action. Desktop/mobile participant-list captures
  and the exact blocker are recorded in the feature evidence directory; no
  paired mutation sign-off is claimed.

Disposition: Core3 participant invitation persistence, permissions, workflow,
restart behavior, and responsive evidence pass for this bounded slice. Surveys
remains **qa-in-progress / conditional**.

## Bounded QA run: Public response restart lifecycle — `SURVEYS-PUBLIC-RESPONSE-RESTART-001`

- Focused public-response suite: **4 passed, 0 failed, 50 assertions** across
  `surveys_public_response*.integration.test.ts`. Coverage includes API/page
  YAML separation, `surveys.public`, start/progress/submit guards, durable
  file-backed restart, deterministic submitted-at, response-count increment,
  invalid survey-token rejection, and idempotent submit replay.
- Scoped lint passed for both public-response integration tests; scoped
  `git diff --check` is clean.
- The full Surveys glob is **50 passed, 0 failed, 410 assertions** across 10
  files. The repository UI audit passed with **673 pages, 682 routes, and
  1,219 datasources**.
- Fresh authenticated Core3 browser evidence covers desktop and mobile start,
  question progression, and final submitted state. CDP probes recorded zero
  horizontal overflow (`1440` desktop / `390` mobile) and the final body text
  `Thank you for your response / Your answers have been submitted`.
- Paired authenticated Odoo evidence reaches the same published Feedback Form
  token, but the live reference response is host-controlled and displays
  `The session will begin automatically when the host starts.` with no question
  controls. This exact fixture/session limitation is captured in
  `source-comparison.md`; no Odoo response-flow sign-off is claimed.
- The full repository regression completed at **1,430 passed, 4 failed,
  12,961 assertions** across 1,434 tests. The four failures are unrelated
  concurrent eCommerce menu/fixture expectations and CRM deterministic-order
  expectations; no Surveys failure reproduced. Other-owner files were not
  edited or staged.

Disposition: Core3 public response persistence, permission contract, workflow,
restart, replay, and responsive browser evidence pass for this bounded slice.
The module remains **qa-in-progress / conditional** pending the wider public
retry/print/report matrix, cleanup of the unrelated shared regression reds,
and a host-started Odoo response comparison.

## Bounded QA run: Results print report — `SURVEYS-RESULTS-PRINT-001`

- Source comparison: Odoo's authenticated `/survey/results/<survey>` controller
  computes filtered statistics, `action_result_survey` opens that route, and
  `survey_templates_statistics.xml` exposes the `Print` control. Core3 keeps
  the results page YAML separate from `api/survey-results.yaml`, with a
  `surveys.read` client Print action and a server mutation.
- Persistence/workflow: the server mutation inserts a deterministic filtered
  row into `survey_results_print_runs`; Completed + Passed against
  `survey-demo-feedback` records one response and seven questions. The
  migration seeds a stable report row, is DuckDB-compatible, and survives
  file-backed close/reopen and replay.
- Focused feature verification: **4 passed, 17 assertions** in
  `surveys_results_print.integration.test.ts`. The final full Surveys glob is
  **54 passed, 0 failed, 427 assertions** across 11 files. Scoped ESLint and
  `git diff --check` pass; `bun run audit` passes with **676 pages, 685 routes,
  and 1,228 datasources**.
- Full repository regression: **1,445 passed, 3 failed, 13,047 assertions**
  across 1,448 tests. The three failures are concurrent eCommerce Pricelists
  and CRM Leads Analysis/Forecast fixture-order expectations; no Surveys test
  failed.
- Authenticated Core3 evidence: desktop 1440x1000 and mobile 390x844 both
  render the Results page, filtered counts, Print control, and no horizontal
  overflow; overriding `window.print` observed exactly one click per viewport.
- Authenticated Odoo evidence: `codex@core3.local` on the reachable
  `core3_reference` service at `127.0.0.1:8069` loaded
  `/survey/results/feedback-form-1` on desktop/mobile and its Print control
  likewise intercepted exactly once. The disposable demo proxy at port 8072
  remains unavailable; the exact probe returned `curl: (7) Failed to connect
  to 127.0.0.1 port 8072`. Evidence and JSON probe results are in the feature
  directory.

Disposition: Core3 persistence, permissions, filtered workflow, restart,
responsive evidence, and paired reachable-Odoo Print comparison pass for this
bounded slice. The Surveys module remains **qa-in-progress / conditional**;
this does not sign off the full module or the unavailable disposable proxy.

## Bounded QA run: `SURVEYS-LIVE-LEADERBOARD-001` — 2026-09-20

- Source comparison: Odoo's authenticated session manager exposes the
  in-progress session context and computes leaderboard data from attendee
  attempts; Core3 adds the equivalent `surveys.read` datasource and keeps the
  page action in `pages/live-session.yaml` separate from
  `api/live-session-results.yaml`.
- Persistence/workflow: the host action is visible only while the session is
  `In Progress`; score rows are ordered deterministically by score and ID,
  empty/closed sessions produce no rows, and file-backed migration replay
  preserves the ranked attendee rows.
- Focused feature verification: **3 passed, 25 assertions** in
  `surveys_live_results.integration.test.ts`. The full Surveys glob is
  **55 passed, 0 failed, 436 assertions** across 11 files. Scoped ESLint and
  `git diff --check` pass.
- Repository audit: **passed**, reporting 676 pages, 685 routes, and 1,239
  datasources. The shared worktree contains concurrent non-Surveys edits, but
  none were staged or changed by this slice.
- Full repository regression: **1,453 passed, 10 failed, 13,104 assertions**
  across 1,463 tests. Two failures are concurrent CRM fixture-order
  expectations; eight are concurrent non-Surveys discovery failures from
  unsupported `components[1].title` keys. No Surveys test failed.
- Authenticated Core3 evidence: isolated runtime desktop 1440x1000 and mobile
  390x844 show the live-session Leaderboard action and ranked Nora Parker / Omar
  Vega rows, with no horizontal overflow. JSON and PNG evidence are under the
  feature directory.
- Authenticated Odoo evidence: `codex@core3.local` reaches the reference
  session manager on desktop/mobile. The exact leaderboard JSON-RPC response is
  empty because the active session has no attendee attempts and
  `session_show_leaderboard=false`; this is a precise fixture blocker, not a
  Core3 test failure.

Disposition: Core3 durable workflow, permission declaration, restart coverage,
and responsive evidence pass for this bounded slice. Odoo comparison remains
conditional on an attendee-populated reference session; the Surveys module
remains **qa-in-progress / conditional**.

## Bounded QA run: `SURVEYS-LIVE-SESSION-JOIN-001` — 2026-09-20

- Source comparison: Odoo's public session-code routes and
  `_fetch_from_session_code` are recorded in the feature source comparison.
  Core3 keeps `pages/live-session-join.yaml` separate from
  `api/live-session-join.yaml` and joins them by `page.id`.
- Persistence/workflow: deterministic attendee ID/token/join key, Ready to
  Waiting, In Progress current-question access, idempotent rejoin, closed and
  certification rejection, and file-backed restart all pass. Migration
  rollback explicitly handles DuckDB dependent indexes.
- Focused feature verification: **3 passed, 25 assertions** in
  `surveys_live_session_join.integration.test.ts`.
- Full Surveys verification: **58 passed, 0 failed, 461 assertions** across
  12 integration files, including the migration rollback/replay suite.
- Authenticated Core3 evidence: isolated runtime desktop 1440x1000 and mobile
  390x844 joined code `5822`; both returned HTTP 200, durable attendee tokens,
  the current Rating question, and no horizontal overflow.
- Authenticated Odoo evidence: desktop/mobile `/s/5822` rendered the access
  code form; `/survey/check_session_code/5822` returned HTTP 200 JSON-RPC
  `{\"error\":\"survey_wrong\"}`. This exact missing-reference-session
  result is a blocker for paired live-session comparison, not a Core3 failure.

Disposition: Core3 bounded access-code lifecycle passes. Surveys remains
**qa-in-progress / conditional**; attendee answer submission, broader route
coverage, and a matching Odoo live session remain open. No module sign-off is
claimed.

Final repository regression: **1,480 passed, 2 failed, 13,308 assertions**
across 1,482 tests. The only failures were concurrent CRM fixture-order
expectations in `crm_leads_analysis.integration.test.ts` and
`crm_forecast.integration.test.ts`; no Surveys test failed. Scoped ESLint,
`git diff --check`, and `bun run audit` all passed. The audit reported 679
pages, 688 routes, and 1,247 datasources.

## Bounded QA run: `SURVEYS-LIVE-SESSION-ANSWER-001` — 2026-09-20

- Source comparison: Odoo's public session submit flow validates the current
  question and stores a session answer line; Core3 keeps the public route in
  `services/surveys/module.ts`, the layout in
  `pages/live-session-join.yaml`, and the mutation in
  `api/live-session-join.yaml`, joined by `page.id`.
- Persistence/workflow: a token-scoped attendee answer inserts one durable
  current-question row, updates deterministic score and session counters, and
  replays safely. Migration `0.0.21` adds the unique session/attendee/question
  index. File-backed reopen and migration replay preserve the answer.
- Focused feature verification: **2 passed, 0 failed, 23 assertions** in
  `surveys_live_session_answer.integration.test.ts`.
- Full Surveys verification: **60 passed, 0 failed, 484 assertions** across
  13 integration files.
- Scoped verification: ESLint passed, `git diff --check` passed, and
  `bun run audit` passed with 679 pages, 688 routes, and 1,250 datasources.
- Authenticated Core3 evidence: isolated runtime desktop 1440x900 and mobile
  390x844 rendered `Answer state: Answered`; browser JSON reports zero failed
  requests and no horizontal overflow. Evidence is under the feature
  directory.
- Authenticated Odoo evidence: desktop/mobile `/s/5822` rendered the access
  code form. Exact `/survey/check_session_code/5822` returned HTTP 200
  JSON-RPC `{"error":"survey_wrong"}`. This means the reference database
  has no matching live session/attendee fixture; it blocks paired answer
  comparison and is not a Core3 failure.

Disposition: Core3 durable workflow, public permission declaration, restart,
replay, and responsive evidence pass for this bounded slice. Odoo comparison
remains conditional, and Surveys stays **qa-in-progress / conditional** with
no module sign-off.

Full repository regression for this wave: `bun test --max-concurrency 1`
completed with **1,497 passed, 2 failed, 13,419 assertions** across 1,499
tests. The only failures were concurrent CRM fixture-order expectations in
`test/crm_leads_analysis.integration.test.ts` and
`test/crm_forecast.integration.test.ts`; no Surveys test failed.

## Bounded QA run: `SURVEYS-PUBLIC-RETRY-001` — 2026-09-20

- Source comparison: Odoo's `/survey/retry/<survey_token>/<answer_token>`
  validates a completed answer, creates a fresh attempt preserving the
  respondent/invitation context, and redirects to the survey start route.
  Core3 exposes the same public retry lifecycle through the YAML-backed
  `surveys.public.retry` mutation and keeps the page/API contracts separate.
- Persistence/workflow: retry is limited to a submitted source answer and a
  published survey, allocates deterministic fresh response/answer tokens,
  preserves respondent context, rejects closed/in-progress/wrong-token
  requests, and replays safely by idempotency key. File-backed restart
  preserves both the source and fresh attempt rows. Existing public submit
  continuation was verified against the fresh retry attempt.
- Focused feature verification: **3 passed, 0 failed, 24 assertions** in
  `surveys_public_retry.integration.test.ts`.
- Full Surveys verification: **63 passed, 0 failed, 508 assertions** across
  14 integration files.
- Scoped verification: ESLint passed for the changed service/test files,
  `git diff --check` passed, and `bun run audit` passed with 681 pages, 690
  routes, and 1,256 datasources.
- Authenticated Core3 evidence: isolated desktop 1440x900 and mobile 390x844
  probes authenticated first, submitted the public retry action, and resumed
  the fresh `Feedback Form` attempt with HTTP 200, `In Progress`, and no
  horizontal overflow. Evidence is under the feature directory.
- Authenticated Odoo evidence: the reference completed `Feedback Form`
  answer was identified by JSON-RPC, but the exact authenticated desktop and
  mobile retry route returned HTTP 200 `Survey Access Error` and did not create
  or redirect to a new attempt. This is the precise installed/reference
  blocker for paired retry comparison; no Odoo sign-off is claimed.
- Full repository regression: **1,514 passed, 3 failed, 13,533 assertions**
  across 1,517 tests. No Surveys test failed. The failures were the unrelated
  eCommerce checkout/restart timeout and CRM Leads Analysis/CRM Forecast
  fixture expectations in `test/ecommerce_actor_matrix.integration.test.ts`,
  `test/crm_leads_analysis.integration.test.ts`, and
  `test/crm_forecast.integration.test.ts`.

Disposition: Core3 durable public retry workflow, permission declaration,
restart/replay coverage, and authenticated responsive evidence pass for this
bounded slice. Odoo comparison remains conditional on the installed reference
route accepting the completed answer token; Surveys remains
**qa-in-progress / conditional** with no module sign-off.

## Bounded QA run: `SURVEYS-TEST-ENTRY-001` — 2026-09-20

- Source comparison: Odoo's authenticated `/survey/test/<survey_token>`
  creates a test answer and redirects to public start; Core3 keeps the
  `survey-test` page/API YAML split and hardens the deterministic test-entry
  action with `surveys.write`, token/state/question, and launch-key guards.
- Persistence/workflow: repeated launches reset one deterministic test row,
  preserve its stable token and key, and remain durable across file-backed
  DuckDB reopen. Archived/no-question/missing-entry/wrong-key requests fail
  atomically.
- Focused verification: **3 passed, 0 failed, 27 assertions** in
  `surveys_test_entry.integration.test.ts`.
- Full Surveys verification: **66 passed, 0 failed, 535 assertions** across
  15 integration files.
- Scoped ESLint for the changed TypeScript test passed; `git diff --check`
  passed. `bun run audit` passed with **682 pages, 691 routes, and 1,259
  datasources**.
- Authenticated Core3 evidence: desktop 1440x900 and mobile 390x844 loaded
  Feedback Form, showed `Entry state: New`, launched the test action, and
  rendered `This is a Test Survey Entry` without horizontal overflow. A
  navigation-aborted shell `/api/v1/companies` request is recorded in the
  evidence JSON; no HTTP response failure occurred.
- Authenticated Odoo evidence: desktop/mobile HTTP 200 test launch rendered
  `This is a Test Survey Entry` and `Pay attention to the host screen until
  the next question.` with matching viewport widths and no request failures.
  No Odoo blocker applies to this route.

Disposition: bounded Core3 workflow, permission/token guards, durable replay,
restart coverage, and paired authenticated desktop/mobile evidence pass.
Surveys remains **qa-in-progress / conditional** because module-wide exit
criteria remain open; no full-module sign-off is claimed.

## Bounded QA run: `SURVEYS-PUBLIC-NEXT-QUESTION-002` — 2026-09-20

- Ownership/binding trace: `public/app.ts:312-325` mounts the
  Surveys-history `public/components/PublicSurvey.ts`; this is an owned
  Surveys binding path, not a generic page component.
- Renderer workflow: required answer capture saves progress, then the
  renderer calls `/next_question` with the expected cursor and deterministic
  key. The returned question drives the next rendered state; reload reads the
  durable cursor; in-flight button serialization prevents duplicate clicks.
- Focused verification: **3 passed, 0 failed, 24 assertions** in
  `surveys_public_next_question.integration.test.ts`.
- Scoped ESLint and `git diff --check`: pass.
- Authenticated Core3 evidence: Admin desktop/mobile both show Question 1 →
  Question 2, replay the same key with HTTP 200/`replayed: true`, restore
  Question 2 after reload, and report zero failed requests with equal body,
  document, and viewport widths.
- Odoo blocker: the installed reference at `127.0.0.1:8069` has no stable
  active answer-token fixture accepted for a fresh mutation probe; no paired
  Odoo visual/mutation sign-off is claimed.

Disposition: the prior disconnected API is now rendered through the
Surveys-owned binding. Core3 evidence passes; Odoo comparison remains
conditional and Surveys remains **qa-in-progress / conditional**.

## Bounded QA run: `SURVEYS-PUBLIC-NEXT-QUESTION-001` — 2026-09-20

- Source comparison: Odoo's `survey_next_question` controller validates the
  answer token/state, saves submitted page data, computes the next ordered
  page/question, and returns the next question HTML. Core3 exposes the bounded
  cursor transition through `surveys.public.next_question` in the API YAML and
  keeps the public controller separate from the page contract.
- Persistence/workflow: migration `20260920230000-022` adds the current
  question cursor and navigation key; start seeds the first question; next
  advances one ordered question; replay returns the same response/cursor;
  restart preserves it; final, closed, stale, invalid-order, wrong-token,
  and non-POST requests do not mutate state.
- Focused feature verification: **3 passed, 0 failed, 19 assertions** in
  `surveys_public_next_question.integration.test.ts`.
- Migration repair verification: **7 passed, 0 failed, 34 assertions** across
  the next-question and migration integration files.
- Full Surveys verification: **69 passed, 0 failed, 554 assertions** across
  16 integration files.
- Scoped verification: ESLint passed for changed Surveys tests,
  `git diff --check` passed, and `bun run audit` passed with **684 pages, 693
  routes, and 1,264 datasources**.
- Core3 desktop/mobile evidence: the token-scoped public API returned HTTP 200
  and `question-feedback-comment` at 1440x900 and 390x844, with zero failed
  requests and body/document widths equal to the viewport. The existing
  `public/components/PublicSurvey.ts` reload renderer still shows its
  client-side Question 1 after the API mutation; that file is outside the
  permitted Surveys-owned paths and is an explicit UI integration blocker.
- Odoo evidence/blocker: the source route is recorded in
  `source-comparison.md`; the installed reference at `127.0.0.1:8069` has no
  stable in-progress answer-token fixture accepted for this mutation route,
  so no fresh paired Odoo next-question request or visual sign-off is claimed.

Disposition: Core3 durable API workflow, permission/token guards,
restart/idempotency, and responsive endpoint evidence pass. UI renderer
integration and paired Odoo mutation evidence remain conditional. Surveys is
still **qa-in-progress / conditional**.

## Bounded QA run: `SURVEYS-PUBLIC-PREVIOUS-QUESTION-001` — 2026-09-20

- Source comparison: Odoo `survey/submit` consumes `previous_page_id` and
  returns the prior page/question; Core3 implements the transition as a
  separate YAML operation/API action and binds the public renderer's Back
  control to it.
- Persistence/workflow: q2 → q1 updates one response cursor; the deterministic
  navigation key replays without a second response row; file-backed DuckDB
  reopen preserves the cursor; first-question, stale, wrong-token, closed,
  invalid-order, and non-POST writes are rejected without mutation.
- Focused verification: **6 passed, 0 failed, 44 assertions** across the
  next/previous integration files.
- Scoped verification: ESLint passed for the changed integration tests,
  `bun run audit` passed with **687 pages, 696 routes, and 1,279 datasources**,
  and `git diff --check` passed. No full-repository run was performed.
- Authenticated Core3 evidence: Admin desktop/mobile at 1440x900 and 390x844
  render Question 2 → Back → Question 1, restore Question 1 after reload,
  replay HTTP 200/`replayed: true`, and report no console/page failures.
- Odoo blocker: the installed reference at `127.0.0.1:8069` has no stable
  active answer-token fixture accepted for a fresh previous-question mutation
  probe; no paired Odoo mutation/visual sign-off is claimed.

Disposition: the bounded Core3 previous-question workflow passes; Surveys
remains **qa-in-progress / conditional**.

## Bounded QA run: `SURVEYS-PUBLIC-LIVE-SESSION-001` — 2026-09-21

- Source/ownership: Odoo's public `/s/<session_code>` route is bound to the
  existing Surveys `survey-live-session-join` page/API contract through the
  new `PublicLiveSession` renderer and `public/app.ts` route dispatch.
- Workflow: code entry → token-scoped join → Ready/waiting or In Progress
  current question → one answer → refresh/reload. Existing YAML guards remain
  authoritative for invalid code, blank name, closed/certification session,
  missing attendee, invalid answer, duplicate answer, and stale state.
- Focused verification: **7 passed, 0 failed, 64 assertions** across the new
  renderer test and existing join/answer suites.
- Scoped ESLint and `git diff --check`: pass. Full repository regression was
  not run for this bounded finalization.
- `bun run audit`: pass — **688 pages, 697 routes, 1,282 datasources**.
- Authenticated Core3 evidence: Admin desktop/mobile at 1440x900 and 390x844
  joined session `5822`, submitted `5`, reloaded the same attendee token, and
  showed `Answer submitted: 5`; body/document widths matched the viewport and
  browser failure lists were empty.
- Odoo blocker: `http://127.0.0.1:8072/s/5822` returned
  `net::ERR_CONNECTION_REFUSED` at both viewports. No paired Odoo visual or
  mutation sign-off is claimed.

Disposition: Core3 public participant rendering and durable API workflow pass;
Odoo comparison remains blocked and Surveys remains **qa-in-progress / conditional**.

## Bounded QA run: `SURVEYS-PUBLIC-ANSWER-VALIDATION-001` — 2026-09-21

- Source comparison: Odoo's `/survey/submit/<survey_token>/<answer_token>`
  delegates values to question-level `validate_question`; Core3 validates
  token-scoped Choice, Rating, Multiple Choice, and Numerical values before
  public progress or submit mutations.
- Persistence/guards: invalid values return HTTP 422
  `SURVEY_PUBLIC_ANSWER_INVALID` without changing `survey_responses`; valid
  values survive file-backed reopen and submit/replay remains idempotent.
- Focused verification: **11 passed, 0 failed, 98 assertions** across public
  validation, response, and next/previous navigation tests.
- Scoped ESLint and `git diff --check`: pass. Full repository regression was
  not run.
- Authenticated Core3 evidence: Admin desktop/mobile at 1440x900 and 390x844
  observed the invalid 422/no-mutation boundary, then rendered valid Question 1
  → Question 2 progression without viewport overflow. The expected 422 is
  present in the browser console because the probe intentionally exercised the
  rejected request; it is recorded as an expected validation response.
- Odoo comparison: authenticated `/survey/start/<token>` returned HTTP 200 at
  both viewports but remained on the host-session waiting state, so no paired
  invalid-answer mutation evidence or sign-off is claimed.

Disposition: Core3 question validation passes; Surveys remains
**qa-in-progress / conditional**.

## Bounded QA run: `SURVEYS-PUBLIC-SCORING-001` — 2026-09-21

- Source: Odoo `survey_user_input._compute_scoring_values` and
  `_compute_scoring_success` persist Score (%) and Quiz Passed using positive
  suggested-answer scores and an 80% default threshold.
- YAML/API: `surveys` page and public submit API remain joined by `page.id`; the
  action is `surveys.public` and exposes `score`/`quiz_passed` in its mutation
  and result contract.
- Focused verification: **2 passed / 16 assertions** for the new scoring test;
  adjacent public regression set: **14 passed / 134 assertions**.
- Persistence/concurrency: score/pass fields survive file-backed DuckDB
  reopen; a concurrent failing submission converges on one idempotent row and
  remains score 0 / failed; malformed tokens are rejected without mutation.
- Core3 authenticated desktop/mobile: Admin login and `/api/auth/me` returned
  200 at 1440x900 and 390x844, but the API returned 404 `API route not found`
  and the rendered public route returned 401.
- Odoo desktop/mobile: the public token redirected to
  `/web/login?redirect=%2Fodoo%3F`; no installed Surveys participant/result
  fixture was available.
- Full Surveys glob: **88 passed / 5 failed / 715 assertions**. Four existing
  DuckDB rollback tests fail on dependent entries, and the existing Test Entry
  fixture-count assertion observes two rows instead of one; neither failure is
  caused by or changed in this scoring slice.
- Scoped ESLint, UI audit, and `git diff --check` passed.

Disposition: implementation and bounded persistence/guard tests pass; browser
and Odoo comparison remain conditional and Surveys is not signed off.

## Bounded QA run: `SURVEYS-PUBLIC-DEADLINE-001` — 2026-09-21

- Odoo's `survey/controllers/main.py:_check_validity` rejects a public answer
  whose deadline has passed; Core3 persists `survey_responses.deadline` and
  returns `SURVEY_PUBLIC_RESPONSE_EXPIRED` before public read/start,
  progress, navigation, submit, or retry mutation.
- Focused verification: **3 passed, 0 failed, 25 assertions** in
  `test/surveys_public_deadline.integration.test.ts`, covering YAML
  permission/410 guards, expired no-mutation behavior, active progress,
  file-backed restart, and replay.
- Browser status: source-served Core3 stopped during discovery with the exact
  `PageSchemaError: Invalid page definition: actions[4].fields is not allowed`.
  No visual result is claimed; the shared boundary was not repaired in another
  owner's files.
- Odoo status: no deadline comparison was run after the Core3 startup blocker;
  no Odoo sign-off is claimed.

Disposition: Core3 deadline workflow and guard tests pass; authenticated
desktop/mobile and paired Odoo evidence are blocked. Surveys remains
**qa-in-progress / conditional**.

## Bounded QA run: `SURVEYS-LIVE-SESSION-PREVIOUS-001` — 2026-09-21

- Source comparison: Odoo's authenticated
  `survey_session_next_question` controller accepts `go_back` and calls the
  ordered session-question resolver; Core3 implements the host back transition
  as `surveys.sessions.previous_question` in the separate
  `api/live-session.yaml` contract, bound to `page.id: survey-live-session`.
- Persistence/guards: the mutation moves `survey_live_sessions.current_question_id`
  and text backward, advances the durable row version, uses a deterministic
  start timestamp, requires `surveys.manage`, rejects closed/non-progress,
  stale row versions, and the first-question boundary. A stale replay leaves
  the cursor and version unchanged.
- Focused verification: **3 passed / 13 assertions** in
  `test/surveys_live_session_previous.integration.test.ts`; the adjacent
  live-session focused set is **15 passed / 107 assertions**.
- Full Surveys glob: **76 passed / 6 failed / 630 assertions**. Existing
  failures are four DuckDB migration rollback dependent-entry cases, one
  authenticated test-entry fixture-count case, and one shared Employee
  page-schema discovery failure; no new failure is attributable to this slice.
- Scoped verification: ESLint passed for the changed test, `bun run audit`
  passed with **692 pages, 701 routes, and 1,290 datasources**, and
  `git diff --check` passed.
- Core3 browser evidence: authenticated desktop/mobile probes reached the
  frontend route, but `/api/pages/survey-live-session` returned exact HTTP 404
  `{"error":"Unknown page: survey-live-session"}` because the concurrent
  backend registry exposed only Blog pages. Error screenshots/results are
  recorded; no Core3 visual sign-off is claimed.
- Odoo comparison: authenticated source instance `/s/5822` returned HTTP 200
  at 1440x900 and 390x844, but
  `/survey/check_session_code/5822` returned JSON-RPC
  `{"error":"survey_wrong"}`. There is no matching active reference live
  session, so no paired previous-question mutation or visual sign-off is
  claimed.

Disposition: the YAML/API workflow, durable cursor, permission boundary,
stale/idempotent replay safety, and restart test pass; browser and Odoo
comparison remain conditional on the shared registry and reference fixture.
Surveys remains **qa-in-progress / conditional**.

## Bounded QA run: `SURVEYS-PUBLIC-BEGIN-001` — 2026-09-21

- Source: Odoo `survey_begin` transitions a valid existing public answer from
  `New` to `In Progress` and prepares the first question.
- Core3 contract: page `id: surveys` remains separate from the API fragment;
  `public_survey_begin` is `surveys.public`, token-scoped, deadline-guarded,
  and first-question constrained. The handler retries a concurrent losing
  writer and replays the committed response.
- Focused verification: **3 passed / 14 assertions** for the new integration
  test; the adjacent public set is **13 passed / 108 assertions**.
- Restart/concurrency coverage: concurrent begin converges on one response;
  file-backed reopen preserves `In Progress` and the question cursor;
  submitted replay remains rejected without changing the snapshot.
- Core3 evidence: desktop/mobile captures and JSON are present, but the
  shared runtime returned HTTP 401 for page probes and authenticated direct
  calls returned HTTP 404 `API route not found` because its Surveys route was
  not registered. No authenticated visual sign-off is claimed.
- Odoo evidence: 8069 returned HTTP 200 in both viewports but only the
  host-controlled Feedback Form waiting state; 8072 returned
  `ERR_CONNECTION_REFUSED`. No paired begin sign-off is claimed.

Disposition: implementation and bounded persistence/guard tests pass;
runtime/reference verification is conditional and Surveys remains
**qa-in-progress / conditional**.

## Bounded QA run: `SURVEYS-PUBLIC-SECTIONS-001` — 2026-09-21

- Source: Odoo's `is_page` rows are section/page headings in the public
  `_prepare_question_html` flow, not answerable questions in
  `_get_survey_questions` navigation.
- Core3 YAML boundary: the existing `surveys` page and `api/surveys.yaml`
  both use `page.id: surveys`; public actions remain `surveys.public`. The
  operations backing the public route explicitly exclude
  `COALESCE(is_page, false) = false` for catalog, first, current, next, and
  previous question resolution.
- Focused verification: **3 passed / 27 assertions** for the new section
  test; the broader public set is **21 passed / 180 assertions**.
- Persistence/concurrency: conditional section rows are skipped, two
  concurrent next calls converge on one durable cursor with a replay, a
  file-backed reopen preserves the cursor, and an invalid section cursor
  leaves state unchanged.
- Core3 desktop/mobile evidence: frontend status 200, body `API route not
  found`, no horizontal overflow, and no failed browser requests. The shared
  runtime route registry blocker prevents authenticated visual sign-off.
- Odoo desktop/mobile evidence: both probes returned status 200 at the login
  page after redirecting from the unavailable synthetic conditional token. No
  authenticated paired comparison is claimed.

Disposition: Core3 implementation and bounded tests pass; runtime/reference
evidence remains conditional and Surveys remains **qa-in-progress /
conditional**.

## Bounded QA run: `SURVEYS-PUBLIC-COOKIE-RESUME-001` — 2026-09-21

- Source: Odoo `survey_start` reads `survey_<survey_token>` for public resume,
  ignores a wrong/deleted cookie, and resets the cookie for 24 hours after
  resolving the durable answer.
- Core3 contract: the existing `surveys` page/API pair remains joined by
  `page.id: surveys`; `public_survey_start` declares optional `answer_token`
  with `surveys.public`, while the module controller implements cookie
  precedence, stale-cookie fall-through, and `Set-Cookie` refresh.
- Focused verification: **3 passed / 19 assertions** for the new test; the
  adjacent public regression set is **24 passed / 200 assertions**.
- Persistence/concurrency: cookie start resumes one response, concurrent
  cookie starts converge on one token, explicit-token precedence is preserved,
  and file-backed reopen restores the cookie-selected response.
- Core3 evidence: authenticated Admin login succeeded at 1440x900 and
  390x844, but the fresh runtime returned HTTP 404 `API route not found` for
  the authenticated public API and HTTP 401 for anonymous access. No visual
  sign-off is claimed; the host/registry boundary is recorded exactly and was
  not edited in this Surveys-only slice.
- Odoo evidence: HTTP 200 at both viewports resolved to the host-controlled
  Feedback Form waiting state. No mutable participant answer fixture was
  available for a cookie-resumed question; no paired Odoo sign-off is claimed.

Disposition: the durable cookie behavior and bounded tests pass; runtime and
reference evidence remain conditional. Surveys remains
**qa-in-progress / conditional**.

## Bounded QA run: `SURVEYS-PUBLIC-END-MESSAGE-001` — 2026-09-21

- Source: Odoo `survey.survey.description_done` is the End Message rendered
  after a public response is completed.
- YAML/API/UI: the `surveys` page and public detail operation remain joined by
  `page.id`; the public submit action remains `surveys.public`, and the
  Surveys-owned renderer consumes the returned completion copy.
- Focused verification: **3 passed / 13 assertions** for the new test;
  adjacent public regression set: **17 passed / 147 assertions**.
- Persistence/concurrency: the configured message survives file-backed reopen;
  two same-key submissions converge on one response, and a wrong token is
  rejected without mutation.
- Core3 authenticated desktop/mobile: login and `/api/auth/me` returned 200 at
  1440x900 and 390x844; the public API returned 404 `API route not found` and
  the rendered public route returned 401.
- Odoo desktop/mobile: the token redirected to
  `/web/login?redirect=%2Fodoo%3F`; no installed Survey completion fixture was
  available.

Disposition: implementation and bounded tests pass; browser/reference evidence
remains conditional and Surveys is not signed off.

## Bounded QA run: Public Date question — `SURVEYS-PUBLIC-DATE-QUESTION-001`

- Source comparison: Odoo `addons/survey/models/survey_question.py` routes
  `date` and `datetime` through `_validate_date`; this slice implements the
  smaller `Date` contract and intentionally does not claim `datetime`, matrix,
  or scale parity.
- YAML/UI contract: `pages/surveys.yaml` remains layout-only and paired with
  `api/surveys.yaml` via `page.id: surveys`; public progress and submit retain
  `surveys.public`. The renderer uses a non-native ISO text control and the
  server validates impossible dates before writing answer JSON.
- Focused verification: **2 passed / 21 assertions** in
  `test/surveys_public_date_question.integration.test.ts`.
- Persistence/guards: invalid `2026-02-30` returns HTTP 422 with
  `SURVEY_PUBLIC_ANSWER_INVALID` and leaves `{}` unchanged; valid
  `2026-01-15` survives file-backed reopen; two same-key submits converge on
  one response row; a wrong answer token returns HTTP 404.
- Core3 evidence: authenticated desktop/mobile login and `/api/auth/me` are
  HTTP 200. The shared runtime returns HTTP 404 `API route not found` for the
  authenticated public API and HTTP 200 `Unauthorized` for the rendered route;
  both viewports report no horizontal overflow or failed browser requests.
- Odoo evidence: both 1440x900 and 390x844 probes return HTTP 200 only at
  `/web/login?redirect=%2Fodoo%3F`; no authenticated installed Survey Date
  fixture exists, so no paired Odoo mutation or visual sign-off is claimed.
- Scoped `git diff --check` and audit/lint results are recorded after final
  verification. Surveys remains **qa-in-progress / conditional**.

## Bounded QA run: Public Datetime question — `SURVEYS-PUBLIC-DATETIME-QUESTION-001`

- Source comparison: Odoo `survey_question._validate_date` uses
  `fields.Datetime.from_string` for `datetime` questions; this slice is
  distinct from the completed `Date` slice and does not claim range metadata,
  matrix, or scale parity.
- YAML/UI contract: `pages/surveys.yaml` remains layout-only and paired with
  `api/surveys.yaml` through `page.id: surveys`; public progress and submit
  retain `surveys.public`. The renderer uses a non-native ISO datetime text
  control and the server validates impossible calendar/time values before
  writing answer JSON.
- Focused verification: **2 passed / 21 assertions** in
  `test/surveys_public_datetime_question.integration.test.ts`.
- Persistence/guards: invalid `2026-02-30 09:30:00` returns HTTP 422 with
  `SURVEY_PUBLIC_ANSWER_INVALID` and leaves `{}` unchanged; valid
  `2026-01-15 09:30:00` survives reopen; same-key submits converge on one row;
  a wrong answer token returns HTTP 404.
- Core3 evidence: authenticated desktop/mobile login and `/api/auth/me` are
  HTTP 200; the shared runtime returns HTTP 404 `API route not found` for the
  public API and HTTP 200 `Unauthorized` for the rendered route. Both viewports
  report no horizontal overflow or failed browser requests.
- Odoo evidence: both viewports return HTTP 200 only at
  `/web/login?redirect=%2Fodoo%3F`; no authenticated installed Survey Datetime
  fixture exists, so no paired Odoo mutation or visual sign-off is claimed.
- Surveys remains **qa-in-progress / conditional**; no module sign-off is
  claimed.

## Bounded QA run: Public conditional question — `SURVEYS-PUBLIC-CONDITIONAL-QUESTION-001`

- Source comparison: Odoo stores `triggering_answer_ids` on questions and
  computes conditional maps from selected answer lines; the conditional demo
  makes the follow-up food-preference question depend on an earlier answer.
- YAML/UI contract: `pages/surveys.yaml` and `api/surveys.yaml` remain
  separate through `page.id: surveys`; every public mutation retains
  `surveys.public`. The trigger relation is projected by public question and
  navigation operations, and the renderer inserts an API-returned follow-up
  instead of treating it as unavailable.
- Focused verification: **2 passed / 25 assertions**; public regression:
  **44 passed / 376 assertions**. Scoped ESLint and `git diff --check` pass.
- Persistence/guards: `Yes` shows the follow-up; `No` skips it in next and
  previous navigation; the cursor and answer survive a file-backed reopen;
  concurrent same-key submit retains one response/idempotency row; a wrong
  answer token is rejected without mutation.
- Core3 desktop/mobile evidence is retained in the feature directory. A fresh
  backend did not expose `/api/modules`; the Vite proxy returned HTTP 502 for
  the public route at both viewports. The direct server retry hit an existing
  `coredb/auth.duckdb.wal` DuckDB internal replay error. No authenticated
  browser sign-off is claimed.
- Odoo desktop/mobile evidence is retained in the feature directory. The
  public route redirected `/ → /odoo → /web/login?redirect=%2Fodoo%3F`; the
  reference had no installed authenticated Survey fixture. No paired Odoo
  sign-off is claimed.
- Migration rollback remains blocked by the known DuckDB dependent-entry
  error; repository audit remains blocked by the concurrent non-Surveys page
  schema. Surveys remains **qa-in-progress / conditional**.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-CONDITIONAL-QUESTION-001/`.

## Bounded QA run: Public Matrix question — `SURVEYS-PUBLIC-MATRIX-QUESTION-001`

- Source comparison: Odoo `survey_question.py` stores Matrix columns and rows
  separately, accepts a row-keyed answer mapping, and validates mandatory row
  coverage; the source demo defines four columns and five rows with multiple
  selections per row.
- YAML/UI contract: `pages/surveys.yaml` and `api/surveys.yaml` remain
  separate and joined by `page.id: surveys`; public progress and submit retain
  `surveys.public`. The renderer exposes the Matrix row/column table while the
  API projects deterministic row/column metadata.
- Focused verification: **2 passed / 22 assertions**; public regression:
  **42 passed / 353 assertions**. ESLint and audit passed (705 pages, 714
  routes, 1340 datasources); scoped diff-check passed.
- Persistence/guards: foreign rows and columns return 422 without mutation;
  valid row-to-column JSON survives reopen; concurrent same-key submit retains
  one response/idempotency row; wrong token returns 404.
- Core3 desktop/mobile: bounded runtime startup did not expose backend port
  4340, and both 1440x900 and 390x844 probes record `ERR_CONNECTION_REFUSED`.
- Odoo desktop/mobile: both probes redirected to
  `/web/login?redirect=%2Fodoo%3F`; no authenticated Matrix fixture was
  available. No paired visual or Odoo mutation sign-off is claimed.
- The existing migration rollback/dependent-entry blocker remains recorded;
  the broader Surveys run also retains one unrelated pre-existing
  `surveys_test_entry` fixture expectation failure. Surveys remains
  **qa-in-progress / conditional**.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-MATRIX-QUESTION-001/`.

## Bounded QA run: Public Scale question — `SURVEYS-PUBLIC-SCALE-QUESTION-001`

- Source comparison: Odoo `survey_question._validate_scale` handles Scale
  answers with configured minimum/maximum values; this slice implements the
  source default 0–10 range and does not claim Odoo's editable range labels or
  matrix parity.
- YAML/UI contract: `pages/surveys.yaml` remains layout-only and paired with
  `api/surveys.yaml` through `page.id: surveys`; public progress and submit
  retain `surveys.public`. The renderer presents the durable Scale options as
  selectable radio controls, and the server validates the option range before
  writing answer JSON.
- Focused verification: **2 passed / 20 assertions** in
  `test/surveys_public_scale_question.integration.test.ts`.
- Persistence/guards: invalid `11` returns HTTP 422 with
  `SURVEY_PUBLIC_ANSWER_INVALID` and leaves `{}` unchanged; valid `8` survives
  reopen; same-key submits converge on one row; a wrong answer token returns
  HTTP 404.
- Core3 evidence: startup is blocked before readiness by
  `components[0].search.categories is not allowed` and
  `components[0].search.or locations... is not allowed`; both viewport probes
  record connection refusal and no visual sign-off.
- Odoo evidence: both viewports return HTTP 200 only at
  `/web/login?redirect=%2Fodoo%3F`; no authenticated installed Survey Scale
  fixture exists, so no paired Odoo mutation or visual sign-off is claimed.
- Surveys remains **qa-in-progress / conditional**; no module sign-off is
  claimed.

## Bounded QA run: Public choice comments — `SURVEYS-PUBLIC-COMMENTS-001`

- Source comparison: Odoo exposes `comments_allowed`, `comments_message`, and
  `comment_count_as_answer`; its controller extracts comment payloads before
  validation and allows a comment to satisfy a mandatory choice when configured.
- YAML/UI contract: `pages/surveys.yaml` and `api/surveys.yaml` remain
  separate through `page.id: surveys`; `survey.public.comment_settings`
  carries comment metadata while public mutations retain `surveys.public`.
  The renderer stores `<question_id>__comment` beside the scalar answer.
- Focused verification: **2 passed / 21 assertions**; public regression:
  **46 passed / 399 assertions**. ESLint, audit (**710 pages, 719 routes,
  1353 datasources**), and scoped diff-check pass.
- Persistence/guards: a comment-only required Choice survives file-backed
  reopen and allows two same-key submissions to converge on one response;
  wrong tokens return 404; a comment on a non-comment question returns 422 and
  leaves its response answer data unchanged.
- Core3 desktop/mobile captures record the exact backend-not-ready 502 and
  proxy refusal; no authenticated visual sign-off is claimed.
- Odoo desktop/mobile captures record `/ → /odoo →
  /web/login?redirect=%2Fodoo%3F`; no installed authenticated Survey comments
  fixture was available, so no paired Odoo sign-off is claimed.
- The known DuckDB migration rollback/dependent-entry gate remains open;
  Surveys remains **qa-in-progress / conditional**.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-COMMENTS-001/`.

## Bounded QA run: Public respondent identity — `SURVEYS-PUBLIC-IDENTITY-001`

- Source comparison: Odoo `survey_question.py:110-115` defines stored
  `save_as_email`/`save_as_nickname`; `survey_user_input.py:294-299` writes
  configured answers to the participant email or nickname; the question form
  exposes both controls at `survey_question_views.xml:153-155`.
- YAML/UI contract: migration `0.0.32` adds durable flags and the published
  `Contact Details` fixture. `survey.public.identity_settings` joins the
  existing `page.id: surveys` page/API pair; public progress and submit retain
  `surveys.public` and update only the token-scoped response identity fields.
- Focused verification: **2 passed / 19 assertions**; public regression:
  **71 passed / 638 assertions**.
- Persistence/guards: email capture is visible on progress, nickname capture
  overrides spoofed submit metadata, both values survive file-backed reopen,
  concurrent same-key submit creates one row, and a wrong token returns 404.
- Core3 authenticated desktop/mobile evidence passed at 1440x900 and 390x844:
  API 200, both identity controls present, no request/page failures, and no
  horizontal overflow.
- Odoo 8069 redirected both viewports to
  `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; disposable proxy 8072 was
  connection-refused. No authenticated Odoo identity fixture was available;
  no paired visual or module sign-off is claimed.
- The broader Surveys run still reproduces the four DuckDB rollback dependent
  entry failures. Surveys remains **qa-in-progress / conditional**.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-IDENTITY-001/`.

## Bounded QA run: Public survey background — `SURVEYS-PUBLIC-BACKGROUND-001`

- Source comparison: Odoo computes `background_image_url` from persisted survey image data, serves `/survey/<token>/get_background_image`, and applies it to the public wrapper. Core3 persists a deterministic URL and SVG asset content and serves the token-scoped API alias.
- YAML/UI contract: `pages/surveys.yaml` and `api/surveys.yaml` remain separate through `page.id: surveys`; the public asset action retains `surveys.public`, and the renderer consumes the persisted URL.
- Focused verification: **2 passed / 23 assertions**; module regression **107 passed / 5 known failures / 898 assertions**. Audit **714 pages, 723 routes, 1364 datasources**, scoped ESLint, and diff-check pass.
- Persistence/guards: the URL and asset content survive file-backed DuckDB reopen; replay returns identical SVG; malformed, unpublished/foreign, and non-GET requests are rejected before asset return.
- Core3 authenticated desktop/mobile evidence passes at 1440x900 and 390x844 with HTTP 200 SVG, computed background URL, no request/page failures, and no horizontal overflow.
- Odoo desktop/mobile both redirect to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; supplied credentials were rejected and port 8072 was connection-refused. No paired Odoo sign-off is claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-BACKGROUND-001/`.

## Bounded QA run: Public suggested-answer images — `SURVEYS-PUBLIC-QUESTION-IMAGE-001`

- Source comparison: Odoo validates public answer context and question/choice ownership before streaming `value_image`; Core3 mirrors this through a token-scoped SVG API and durable `value_image_content` fixture.
- YAML/UI contract: the authenticated `surveys` page remains separate from the `surveys.public.question_image` API action through `page.id: surveys`; public question metadata carries image-answer IDs and the renderer consumes them.
- Verification: focused image/background checks **4 passed / 44 assertions**; full public/core Surveys regression **75 passed / 682 assertions**; scoped ESLint and diff-check pass.
- Persistence/guards: the deterministic image survives file-backed reopen; replay is stable; wrong answer token, foreign suggested-answer/question pairing, and POST are rejected before content return.
- Core3 authenticated desktop/mobile evidence passed after the shared page-schema boundary was repaired: the public image returned HTTP 200 `image/svg+xml`, with no request/page failures or horizontal overflow. Audit passed at 716 pages, 725 routes, and 1370 datasources.
- Odoo desktop/mobile redirect to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; port 8072 is connection-refused. No paired Odoo sign-off is claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-QUESTION-IMAGE-001/`.

## Bounded QA run: Public Numerical question — `SURVEYS-PUBLIC-NUMERICAL-QUESTION-001`

- Source comparison: Odoo `survey_question._validate_numerical_box` defines
  numeric parsing and inclusive configured range validation; Core3 persists the
  corresponding validation fields in migration `0.0.36`.
- YAML/UI contract: `pages/surveys.yaml` and `api/surveys.yaml` remain
  separate through `page.id: surveys`; public question metadata carries the
  range and public mutations retain `surveys.public`.
- Focused verification: **2 passed / 26 assertions**; public/core Surveys
  regression: **77 passed / 708 assertions**; audit **718 pages, 727 routes,
  1375 datasources**; scoped ESLint and diff-check pass.
- Persistence/guards: malformed, below-range, and above-range values return
  422 without mutation; a valid decimal survives file-backed reopen; concurrent
  same-key submit produces one response/count; a wrong token returns 404.
- Core3 authenticated admin/public desktop/mobile probes passed at 1440x900
  and 390x844 with range attributes, client validation evidence, no request/page
  failures, and no horizontal overflow.
- Odoo desktop/mobile redirect to
  `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; port 8072 is unavailable. No
  authenticated Numerical fixture or paired Odoo sign-off is claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-NUMERICAL-QUESTION-001/`.

## Bounded QA run: Public Char question — `SURVEYS-PUBLIC-CHAR-QUESTION-001`

- Source comparison: Odoo `survey_question._validate_char_box` defines email
  syntax and inclusive configured length validation; Core3 migration `0.0.37`
  persists the matching flags, bounds, and message.
- YAML/UI contract: `pages/surveys.yaml` and `api/surveys.yaml` remain separate
  through `page.id: surveys`; public question metadata carries the Char rules
  and public mutations retain `surveys.public`.
- Focused verification: **2 passed / 26 assertions**; public/core Surveys
  regression: **79 passed / 733 assertions**; audit **718 pages, 727 routes,
  1379 datasources**; scoped ESLint and diff-check pass.
- Persistence/guards: malformed email and too-short values return 422 without
  mutation; a valid address survives file-backed reopen; concurrent same-key
  submit produces one response/count; a wrong token returns 404.
- Core3 authenticated admin/public desktop/mobile probes pass at 1440x900 and
  390x844 with email and length attributes, client validation evidence, no
  request/page failures, and no horizontal overflow.
- Odoo desktop/mobile redirect to
  `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; port 8072 is unavailable. No
  authenticated Char fixture or paired Odoo sign-off is claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-CHAR-QUESTION-001/`.

## Bounded QA run: Public Text question — `SURVEYS-PUBLIC-TEXT-QUESTION-001`

- Source comparison: Odoo `text_box` is the Multiple Lines Text Box, rendered
  as a three-row textarea and persisted as `value_text_box`; mandatory empty
  answers are rejected before submission. Core3 migration `0.0.38` persists a
  deterministic required `Text` fixture.
- YAML/UI contract: `pages/surveys.yaml` and `api/surveys.yaml` remain separate
  through `page.id: surveys`; the public mutation actions retain
  `surveys.public`.
- Focused verification: **2 passed / 23 assertions**; public/core Surveys
  regression: **81 passed / 756 assertions**; audit **718 pages, 727 routes,
  1382 datasources**; scoped ESLint and diff-check pass.
- Persistence/guards: array-shaped and missing values return 422 without
  mutation; newline text survives file-backed reopen; concurrent same-key
  submit produces one response/count; a wrong token returns 404.
- Core3 authenticated `/api/pages/surveys` returns 200 after the module runtime
  binding repair, but the isolated browser topology reports `Service host
  unavailable`; anonymous public API access returns 401. No visual sign-off is
  claimed.
- Odoo desktop/mobile redirect to
  `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; port 8072 is unavailable. No
  authenticated Text fixture or paired Odoo sign-off is claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-TEXT-QUESTION-001/`.

## Bounded QA run: Public Multiple Choice question — `SURVEYS-PUBLIC-MULTIPLE-CHOICE-001`

- Source comparison: Odoo declares `multiple_choice`, accepts multiple listed
  answers (and normalizes a scalar), then saves the selected choice lines as a
  replacement set. Core3 maps this to durable `Multiple Choice` option arrays.
- YAML/UI contract: `pages/surveys.yaml` and `api/surveys.yaml` remain
  separate through `page.id: surveys`; checkbox rendering uses the existing
  public binding and progress/submit retain `surveys.public`.
- Focused verification: **2 passed / 24 assertions**; public/core Surveys
  regression: **83 passed / 780 assertions** across 27 files; audit **719
  pages, 728 routes, 1391 datasources**; scoped ESLint and diff-check pass.
- Persistence/guards: duplicate and foreign options return 422 without
  mutation; empty required submit is rejected; valid selections survive a
  file-backed reopen; concurrent same-key submit produces one response/count;
  a wrong token returns 404.
- Core3 desktop/mobile probes at 1440x900 and 390x844 recorded
  `ERR_CONNECTION_REFUSED` before rendering; no visual sign-off is claimed.
- Odoo desktop/mobile redirected to
  `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; proxy 8072 was connection-refused.
  No authenticated Odoo Multiple Choice fixture or parity sign-off is claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-MULTIPLE-CHOICE-001/`.

## Bounded QA run: Live-session question timer — `SURVEYS-LIVE-QUESTION-TIMER-001`

- Source comparison: Odoo stores per-question `is_time_limited` and
  `time_limit`, starts the timer from the host's question start timestamp,
  exposes timer data to the attendee template, and rejects late answers with
  the source timeout message.
- YAML/UI contract: `pages/live-session-join.yaml` and
  `api/live-session-join.yaml` remain separate and join through
  `page.id: survey-live-session-join`; the API returns timer metadata and the
  mutation retains `surveys.public` plus attendee-token/state guards before
  `SURVEY_SESSION_QUESTION_TIME_EXPIRED`.
- Focused verification: **4 passed / 45 assertions**; full Surveys glob:
  **120 passed / 4 failed / 1041 assertions**. The four failures are the
  existing DuckDB migration rollback/dependent-entry blocker.
- Persistence/guards: expiry returns 409 without answer or counter mutation;
  a valid answer persists, survives file-backed reopen, and replays the
  original answer idempotently.
- Audit: **721 pages, 730 routes, 1396 datasources**. Scoped ESLint and
  `git diff --check` pass.
- Core3 authenticated desktop/mobile probes at 1440x900 and 390x844 were
  blocked before render by `ERR_CONNECTION_REFUSED` on port 3000.
- Odoo desktop/mobile reached only the login shell at 8069; port 8072 refused.
  No authenticated installed Surveys fixture, visual comparison, or module
  sign-off is claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-LIVE-QUESTION-TIMER-001/`.

## Bounded QA run: Public survey-level timer — `SURVEYS-PUBLIC-SURVEY-TIMER-001`

- Source comparison: Odoo `survey_survey.py:120-121,189-190` stores the
  survey-level `is_time_limited` and minute `time_limit`; `survey_user_input.py`
  stores `start_datetime` and computes `survey_time_limit_reached`; controller
  lines 291-295 and 365/431/545-569 expose the timer and block expired
  attempts. This is distinct from response `deadline` and the live question
  timer.
- YAML/UI contract: migration `0.0.41` adds the durable fields and fixed
  one-minute fixture. `pages/surveys.yaml` and `api/surveys.yaml` remain
  separate through `page.id: surveys`; operations project `start_datetime` and
  timer metadata; the public renderer displays the countdown and the API/module
  retain `surveys.public` token guards.
- Focused verification: **9 passed, 0 failed, 99 assertions** across timer,
  deadline, public response, and response-restart integration tests.
- Full Surveys glob: **122 passed, 4 failed, 1,065 assertions**. The four
  failures are the existing DuckDB migration rollback/dependent-entry failures
  in `surveys_migrations.integration.test.ts`; no new timer failure remains.
- Persistence/guards: start returns durable `start_datetime`; expired GET and
  progress return HTTP 410 `SURVEY_PUBLIC_TIME_LIMIT_EXPIRED` without changing
  response state/data; a future attempt progresses and survives file-backed
  reopen/token replay.
- Audit: **722 pages, 731 routes, 1,400 datasources**; scoped ESLint and
  `git diff --check` pass.
- Core3 desktop/mobile probes were blocked before render by connection refusal
  on ports 3000/3001/3002; no visual sign-off is claimed.
- Odoo 8069 redirected `/odoo/surveys` to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`;
  the primary Surveys addon is uninstalled and proxy 8072 was unavailable.
  Desktop/mobile login-shell captures and exact blocker JSON are in the feature
  evidence directory; no paired Odoo sign-off is claimed.

Disposition: bounded Core3 timer lifecycle passes; Surveys remains
**qa-in-progress / conditional**.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-SURVEY-TIMER-001/`.

## Bounded QA run: Question duplication — `SURVEYS-QUESTION-DUPLICATE-001`

- Source comparison: Odoo `survey.question.copy()` delegates to ORM copy and
  preserves trigger relationships; the form keeps create disabled while
  allowing the duplicate action.
- YAML/UI contract: `pages/question-detail.yaml` and
  `api/question-detail.yaml` keep separate page/API actions and join through
  `page.id: survey-question-detail`; the Actions-menu action is
  `surveys.write`-protected.
- Persistence/workflow: the YAML mutation copies one question and all
  suggested values, increments the parent survey version, and returns the new
  row for navigation. Missing, archived, stale, and duplicate-id requests are
  rejected before a second durable row is created.
- Focused verification: **3 passed / 21 assertions**; file-backed restart and
  replay are covered. The bounded Surveys run is **125 passed / 4 failed /
  1,086 assertions** across 129 tests; the four failures are the documented
  migration rollback/dependent-entry failures.
- Audit: **723 pages, 732 routes, 1,402 datasources**. Core3 ports refused
  before authenticated desktop/mobile render. Odoo redirected both viewports
  to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; proxy 8072 refused. No visual
  or Odoo parity sign-off is claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-QUESTION-DUPLICATE-001/`.

## `SURVEYS-PUBLIC-ATTEMPT-LIMIT-001` — per-respondent attempt limit

- Source comparison: Odoo `survey_survey.py` stores access mode, login
  requirement, and attempt-limit/count fields; `_has_attempts_left` counts
  submitted non-test answers by respondent identity and the public controller
  rechecks the boundary at submission.
- YAML/UI contract: migration `0.0.42` adds durable metadata and a deterministic
  limited public fixture. `pages/surveys.yaml` and `api/surveys.yaml` remain
  separate and joined by `page.id: surveys`; list/detail projections and the
  public renderer expose the metadata and email entry control.
- Persistence/workflow: start normalizes respondent email, requires it for the
  limited fixture, counts submitted non-test attempts, and returns
  `SURVEY_PUBLIC_ATTEMPTS_EXHAUSTED` without creating a second row. Submit and
  retry enforce the same boundary; file-backed reopen and concurrent idempotent
  starts are covered.
- Focused verification: **3 passed / 30 assertions**; related retry coverage
  **6 passed / 54 assertions**. Full Surveys: **128 passed / 4 failed / 1,116
  assertions** across 132 tests; the four failures are the known DuckDB
  migration rollback/dependent-entry blocker. Audit: **725 pages, 734 routes,
  1,407 datasources**; scoped ESLint and diff-check pass.
- Runtime/reference: Core3 ports 3000/3001/3002 refused connections. Odoo
  8069 redirected desktop/mobile probes to the login shell and proxy 8072
  refused. These exact blockers are recorded in `browser-results.json`; no
  authenticated desktop/mobile or Odoo parity sign-off is claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-ATTEMPT-LIMIT-001/`.

## `SURVEYS-PUBLIC-BACK-GUARD-001` — public Previous permission setting

- Source comparison: Odoo `users_can_go_back` is durable at
  `survey_survey.py:98`; `_can_go_back` at `647-664` also requires an active
  response/layout/cursor, and the public controller emits `can_go_back` at
  `controllers/main.py:359,363`.
- YAML/UI contract: migration `0.0.43` adds the field and a deterministic
  published two-question false fixture. `pages/surveys.yaml` and
  `api/surveys.yaml` remain separate through `page.id: surveys`; list/detail
  fields and the public operation expose the setting.
- Persistence/workflow: the renderer omits Back when disabled; the public
  mutation independently rejects direct bypass with
  `SURVEY_PUBLIC_PREVIOUS_DISABLED`. Restart preserves false; enabling the
  setting permits concurrent Previous requests to replay one durable key.
- Focused verification: **6 passed / 41 assertions**; public/catalog
  regression **91 passed / 857 assertions** across 30 files. Full Surveys:
  **131 passed / 4 failed / 1,139 assertions** across 135 tests; the four
  failures are the existing DuckDB migration rollback/dependent-entry errors.
  Audit: **726 pages, 735 routes, 1,409 datasources**; scoped ESLint and
  diff-check pass.
- Runtime/reference: Core3 ports 3000/3001/3002 refused connections. Odoo
  8069 returned 303 to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; proxy 8072
  refused. Desktop/mobile captures and exact results are in
  `browser-results.json`; no authenticated visual or Odoo sign-off is claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-BACK-GUARD-001/`.

## `SURVEYS-PUBLIC-ONE-PAGE-001` — one-page public pagination

- Source: Odoo stores required `questions_layout` with `one_page` at
  `survey_survey.py:75-79`; the public controller uses page payload semantics
  at `controllers/main.py:278-298`, omits the back cursor at `337-363`, and
  marks the response done at `581-582`.
- Durable/API/page: migration `0.0.45` adds the setting and fixture;
  `survey.public.detail` and the admin list expose it; `pages/surveys.yaml`
  and `api/surveys.yaml` remain joined by `page.id: surveys`.
- Workflow/guards: the renderer collects all visible answers and submits one
  durable response; required-answer, token, response-state, time, and
  idempotency guards stay authoritative in the existing public route.
- Focused: **3 passed / 21 assertions**. Public/catalog: **97 passed / 903
  assertions**. Audit: **729 pages, 738 routes, 1,419 datasources**. Scoped
  ESLint and diff-check pass.
- Runtime/reference: Core3 ports 3000/3001/3002 refused. Odoo desktop and
  mobile probes returned 303 to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`;
  proxy 8072 refused. No authenticated visual or Odoo comparison/sign-off is
  claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-ONE-PAGE-001/`.

## `SURVEYS-PUBLIC-PROGRESSION-MODE-001` — public progression display

- Source: Odoo stores `progression_mode` at `survey_survey.py:85-88`; its
  public progression template renders percent or numeric progress at
  `survey_templates.xml:691-704`, with controller page/cursor data at
  `controllers/main.py:386-400`.
- Durable/API/page: migration `0.0.46` adds the setting and numbered fixture;
  `survey.public.detail` and the admin list expose it; `pages/surveys.yaml`
  and `api/surveys.yaml` remain joined by `page.id: surveys`.
- Workflow/guards: page-per-question rendering consumes the setting; one-page
  rendering stays all-questions; public token, state, required-answer, time,
  and idempotency boundaries are unchanged.
- Focused: **3 passed / 18 assertions**. Public/catalog: **100 passed / 921
  assertions**. Audit: **731 pages, 740 routes, 1,424 datasources**. Scoped
  ESLint and diff-check pass.
- Runtime/reference: Core3 ports 3000/3001/3002 refused. Odoo desktop and
  mobile probes returned 303 to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`;
  proxy 8072 refused. No authenticated visual or Odoo comparison/sign-off is
  claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-PROGRESSION-MODE-001/`.

## Bounded QA run: `SURVEYS-PUBLIC-RANDOM-SELECTION-001` — 2026-09-21

Wave 27 implements Odoo's `questions_selection=random` public workflow. The
response stores a deterministic token-seeded `question_order`; public start,
begin, retry, next, previous, and the rendered page use that same order. The
page/API pair remains separate (`page.id: surveys`), with `surveys.read` for
the authenticated admin contract and `surveys.public` for token-bound public
mutations.

Focused random-selection tests pass **2/2 with 26 assertions**. Adjacent public
progression and next/previous tests pass **9/9 with 62 assertions**. Restart
and concurrent same-key navigation replay are covered. Core3 authenticated
desktop/mobile probes could not start because ports 3000, 3001, 3390, and 3391
were unavailable. Odoo `/odoo/surveys?` returned 303 to the login route at
both requested viewport probes; proxy 8072 refused. This remains conditional,
with no authenticated visual or Odoo parity sign-off claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-RANDOM-SELECTION-001/`.

## Bounded QA run: `SURVEYS-PUBLIC-SKIPPED-QUESTION-001` — 2026-09-21

Wave 28 implements Odoo's optional public-question skipped state. Core3
persists a validated delimiter-safe skipped-question ID set, keeps required
questions from being skipped, and restores the state in the public renderer
after restart. The page/API pair remains separate (`page.id: surveys`), with
`surveys.public` for token-bound mutations and `surveys.read` for authenticated
response inspection.

Focused skipped-question tests pass **2/2 with 21 assertions**. The adjacent
public regression passes **13/13 with 126 assertions**, including restart and
concurrent idempotent submit. Core3 authenticated desktop/mobile probes could
not start because ports 3000, 3001, 3390, and 3391 were unavailable. Odoo
`/odoo/surveys?` returned 303 to login at both requested viewport probes;
proxy 8072 refused. This remains conditional with no visual or Odoo parity
sign-off claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-SKIPPED-QUESTION-001/`.

## `SURVEYS-PUBLIC-LANGUAGE-001` — public respondent language

- Source comparison: Odoo `survey.survey.lang_ids` stores supported languages;
  `survey.user_input.lang_id` stores the participant choice; `/survey/begin`
  accepts `lang_code` and applies it before the response enters progress.
- YAML/UI contract: migration `0.0.49` adds `surveys.languages` and
  `survey_responses.language_code`; the separate `pages/surveys.yaml` and
  `api/surveys.yaml` contracts expose the fields through `page.id: surveys`.
  The public renderer provides a selector only when more than one supported
  language is configured.
- Persistence/guards: unsupported codes return
  `SURVEY_PUBLIC_LANGUAGE_INVALID` without a response row; concurrent same-key
  starts converge on one `fr_FR` response; file-backed reopen preserves it;
  changing the language on an in-progress response returns
  `SURVEY_PUBLIC_LANGUAGE_LOCKED`.
- Verification: **2 focused tests / 25 assertions** and **9 adjacent tests /
  107 assertions** pass. Audit: **737 pages, 746 routes, 1,449 datasources**;
  scoped ESLint and diff-check pass.
- Runtime/reference: Core3 ports 3000, 3001, 3390, and 3391 refused. Odoo
  `/odoo/surveys?` returned 303 to login and `/survey/check_session_code/5822`
  returned `{"error":"survey_wrong"}`. No authenticated desktop/mobile
  capture, installed Odoo language fixture, or parity sign-off is claimed.

Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-LANGUAGE-001/`.

## `SURVEYS-PUBLIC-LIVE-POLL-001` — live-session attendee polling

- Source comparison: Odoo's host `next_question` route publishes a
  token-scoped `next_question` event; the public session-code helper rejects
  invalid, certification, and non-launched sessions.
- YAML/UI contract: the existing `survey-live-session-join` page/API pair
  remains joined by `page.id`; the public route calls the paired
  `survey.public.session.poll` operation and exposes durable `poll_revision`.
- Persistence/guards: polling requires an attendee token, scopes the current
  question and answer to that attendee/session, returns 404 for foreign
  tokens and 405 for non-GET calls, and uses durable `row_version` to observe
  host question changes across concurrent reads and restart.
- Renderer: waiting and already-answered attendee states poll every three
  seconds; active unanswered forms are not replaced while being edited.
- Verification: **2 focused tests / 20 assertions** and **10 adjacent tests /
  93 assertions** pass. Audit: **737 pages, 746 routes, 1,450 datasources**;
  scoped ESLint and diff-check pass.
- Runtime/reference: Core3 ports 3000, 3001, 3390, and 3391 refused. Odoo
  `/odoo/surveys?` returned 303 to login and `/survey/check_session_code/5822`
  returned `{"error":"survey_wrong"}`. No authenticated desktop/mobile
  capture or paired Odoo live-session fixture is available; no sign-off is
  claimed.

Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-LIVE-POLL-001/`.

## Bounded QA run: `SURVEYS-CERTIFICATION-REPORT-001` — 2026-09-21

- Source/UI: Odoo's authenticated `get_certification` route is represented by
  the separate `survey-certification-report` page/API pair; participant detail
  exposes it only for completed passed attempts.
- Persistence/guards: the deterministic report history row survives migration
  replay and file-backed DuckDB reopen. Failed/in-progress participants return
  `SURVEY_CERTIFICATION_NOT_PASSED`; requested-by/current-user mismatch returns
  `SURVEY_CERTIFICATION_REPORT_ACTOR`; same-key concurrent calls converge.
- Verification: **4 focused tests / 22 assertions** pass. No full-repository
  sign-off is claimed.
- Runtime/reference: Core3 desktop/mobile probes were blocked by unavailable
  service ports. Odoo's authenticated certification fixture was unavailable;
  no desktop/mobile visual or paired Odoo sign-off is claimed.

Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-CERTIFICATION-REPORT-001/`.

## Bounded QA run: SURVEYS-CERTIFICATION-BADGE-001 — 2026-09-21

- Source/UI: Odoo's certification badge configuration and success trigger are
  represented by the separate authenticated survey-certification-badge
  page/API pair and passed participant-detail entry point.
- Persistence/guards: survey_certification_badges has one deterministic row
  per participant. Failed/in-progress participants return
  SURVEY_CERTIFICATION_BADGE_NOT_PASSED; actor mismatch returns
  SURVEY_CERTIFICATION_BADGE_ACTOR; replay and same-key concurrency do not
  create a second award.
- Verification: 4 focused tests / 22 assertions and 31 adjacent tests /
  264 assertions pass. Audit, scoped lint, and diff-check pass.
- Runtime/reference: Core3 desktop/mobile probes were refused on ports 3000,
  3001, 3390, and 3391. Odoo /odoo/surveys? returned 303 to login and the
  session probe returned 415 for missing JSON-RPC content type. No visual,
  public-renderer, or paired Odoo sign-off is claimed.

Evidence:
plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-CERTIFICATION-BADGE-001/.

## Bounded QA run: `SURVEYS-INVITE-ATTACHMENT-001` — 2026-09-21

- Source/UI: Odoo `survey.invite.attachment_ids` is a many-to-many binary
  composer field (`survey_invite_views.xml:59-64`) and `_send_mail` passes each
  selected attachment into the outgoing mail (`survey_invite.py:231-241`).
  Core3 binds a separate authenticated invitation page/API pair and shared
  attachment upload/download surface.
- Persistence/guards: `survey_invite_attachments` survives migration replay
  and file-backed reopen. The upload requires `surveys.write` and a current
  actor, and rejects missing/archived invites, stale invitation versions,
  empty files, and duplicate names before mutation.
- Verification: **3 focused tests / 32 assertions** and **29 adjacent tests /
  274 assertions** pass. UI audit reports **746 pages, 755 routes, and 1,483
  datasources**; scoped ESLint and `git diff --check` pass. Full repository
  regression was not run for this bounded slice.
- Runtime/reference: Core3 desktop/mobile probes were refused on ports 3000,
  3001, 3390, and 3391. Odoo `/odoo/surveys?` returned 303 to login; the
  session probe returned 200 with `{"error":"survey_wrong"}`. No
  authenticated desktop/mobile capture or paired Odoo sign-off is claimed.

Evidence:
plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-INVITE-ATTACHMENT-001/.

## Bounded QA run: `SURVEYS-RESTRICTED-USERS-001` — 2026-09-21

- Source/UI: Odoo defines `restrict_user_ids` as a Survey many-to-many field,
  renders avatar tags on the form, and filters Survey officer access to
  unrestricted surveys or surveys containing the current user
  (`survey_survey.py:65-69`; `survey_survey_views.xml:63-70`;
  `survey_security.xml:38-47`).
- Persistence/guards: Core3's `survey_restricted_users` relation is durable and
  restart-safe. Catalog, detail, and relation reads filter by actor; add/remove
  require `surveys.write`, an actor, a live survey, and current parent/relation
  versions. Duplicate and stale requests do not mutate state.
- Verification: **3 focused tests / 26 assertions** and **34 adjacent tests /
  310 assertions** pass. UI audit reports **747 pages, 756 routes, and 1,490
  datasources**; scoped ESLint and diff-check pass. Full repository regression
  was not run for this bounded slice.
- Runtime/reference: Core3 desktop/mobile probes were refused on ports 3000,
  3001, 3390, and 3391. Odoo `/odoo/surveys?` returned 303 to login; the
  session probe returned 200 with `{"error":"survey_wrong"}`. No
  authenticated desktop/mobile capture or paired Odoo sign-off is claimed.

Evidence:
plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-RESTRICTED-USERS-001/.

## Bounded QA run: `SURVEYS-RESPONSIBLE-USER-001` — 2026-09-21

- Source/UI: Odoo's `survey.survey.user_id` is the internal Responsible
  many2one, rendered separately from `restrict_user_ids`; its model
  constraint preserves responsible-user access for restricted surveys.
- Persistence/guards: Core3 migrations `0.0.54`/`0.0.55` add and seed durable
  responsible fields. Catalog/detail projections and the existing
  `survey-detail` page/API pair expose them. Assignment requires
  `surveys.write`, an authenticated actor, non-archived/current row version,
  valid fields, and restricted membership where applicable.
- Verification: **3 focused tests / 17 assertions** pass. The test covers
  page/API binding, permission/actor and stale/restricted guards, durable
  assignment, and file-backed restart. Scoped diff-check passes; full
  repository regression was not run.
- Runtime/reference: Core3 ports 3000, 3001, 3390, and 3391 were unavailable
  for authenticated desktop/mobile capture. Odoo port 8072 was unavailable.
  No authenticated visual or paired Odoo sign-off is claimed.

Evidence:
plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-RESPONSIBLE-USER-001/.

## Bounded QA run: `SURVEYS-ACTIVITY-001` — 2026-09-21

- Source/UI: Odoo `survey.survey` inherits `mail.activity.mixin`, renders
  `activity_ids` in the Survey kanban, and defines activity search filters.
- Persistence/guards: Core3 migrations `0.0.56`/`0.0.57` add and seed durable
  activities. Schedule/complete actions are joined to `survey-detail` through
  the API/page `page.id`, require `surveys.write` and an actor, and enforce
  parent/activity optimistic versions plus valid type/date/summary/state.
- Verification: **3 focused tests / 18 assertions** pass; adjacent catalog,
  responsible-user, and activity regression is **29 passed / 255 assertions**.
  This includes durable schedule/complete, stale replay rejection, and
  file-backed restart. Scoped diff-check passes; full repository regression
  was not run.
- Runtime/reference: Core3 ports 3000, 3001, 3390, and 3391 were unavailable
  for authenticated desktop/mobile capture. Odoo port 8072 was unavailable.
  No authenticated visual or paired Odoo sign-off is claimed.

Evidence:
plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-ACTIVITY-001/.

## Bounded QA run: `SURVEYS-CHATTER-NOTE-001` — 2026-09-21

- Source/UI: Odoo `survey.survey` inherits `mail.thread` and renders its
  form `<chatter/>` widget.
- Persistence/guards: Core3 migrations `0.0.58`/`0.0.59` add and seed durable
  notes. The existing activity/chatter datasource combines activities and
  notes; `log_survey_note` requires `surveys.write`, an actor, a live/current
  survey row version, and valid content. Parent version advancement rejects
  duplicate stale replay.
- Verification: **3 focused tests / 12 assertions** pass; activity/chatter
  compatibility is **6 passed / 30 assertions**, including restart and
  migration replay. Scoped diff-check passes; full repository regression was
  not run.
- Runtime/reference: Core3 ports 3000, 3001, 3390, and 3391 were unavailable
  for authenticated desktop/mobile capture. Odoo port 8072 was unavailable.
  No authenticated visual or paired Odoo sign-off is claimed.

Evidence:
plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-CHATTER-NOTE-001/.

## Bounded QA run: `SURVEYS-FOLLOWERS-001` — 2026-09-21

- Source/UI: Odoo `survey.survey` inherits `mail.thread`; its form's
  `<chatter/>` is the source for the authenticated follower surface.
- Persistence/contracts: migrations `0.0.60`/`0.0.61` add and seed the durable
  relation. Follower listing, candidate filtering, add, and remove are joined
  through the existing separate API/page YAML by `page.id: survey-detail`.
- Guards: reads use `surveys.read`; writes use `surveys.write`, require an
  authenticated actor, reject missing/duplicate followers, reject archived or
  parent-stale surveys, and reject stale or mismatched relation rows. Odoo
  Surveys has no `company_id` in the inspected source, so company scoping is
  not applicable to this feature.
- Verification: **3 focused tests / 20 assertions**; adjacent catalog,
  chatter, activity, and follower regression **32 passed / 270 assertions**.
  Audit reports **753 pages, 762 routes, and 1,519 datasources**; scoped
  ESLint and diff-check pass.
- Regression blocker: the broad Surveys run reproduced DuckDB's existing
  dependency error while replaying migration rollback:
  `Cannot alter entry "surveys" because there are entries that depend on it`.
  It was terminated after the bounded checks; no full repository regression
  was run.
- Runtime/reference: ports 3000, 3001, 3390, 3391, and 8072 were closed.
  Authenticated Core3 desktop/mobile and paired Odoo captures are therefore
  unavailable; no visual or Odoo sign-off is claimed.

Evidence:
plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-FOLLOWERS-001/.
## Bounded QA run: `SURVEYS-LIVE-SPEED-RATING-001` — 2026-09-21

- Source/UI: Odoo renders `session_speed_rating` and
  `session_speed_rating_time_limit` in the Live Session group and applies
  elapsed-time scoring to correct timed session answers.
- Persistence/contracts: migrations `0.0.62`/`0.0.63` add and seed the
  setting. The authenticated update action is bound through the separate
  `survey-detail` API/page pair; the public answer behavior remains in the
  separate `survey-live-session-join` API/page pair.
- Guards: `surveys.write` and actor checks protect configuration; missing,
  invalid-window, archived/stale, token/attendee, question-time, and duplicate
  replay guards preserve no-mutation behavior. The Odoo Survey source has no
  `company_id`, so company scope is not applicable to this slice.
- Verification: **3 focused tests / 23 assertions**; adjacent live-session,
  chatter, follower, activity, and results regression **22 passed / 168
  assertions**. Scoped ESLint and diff-check pass.
- Audit: final `bun run audit` passes with **754 pages, 763 routes, and 1,525
  datasources**. No full repository regression was run.
- Runtime/reference: ports 3000, 3001, 3390, 3391, and 8072 were closed;
  authenticated Core3 desktop/mobile and paired Odoo captures are unavailable.
  No visual or Odoo sign-off is claimed.

Evidence:
plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-LIVE-SPEED-RATING-001/.

## Bounded QA run: `SURVEYS-QUESTION-REORDER-001` — 2026-09-21

- Source/UI: Odoo's Questions tab uses the `question_page_one2many` widget and
  `sequence` handle to reorder `question_and_page_ids`; the model's stable
  order is `sequence,id`.
- Persistence/contracts: migration `0.0.64` adds the deterministic ordering
  index. The separate `survey-detail` API/page pair exposes the reorder form
  through matching `page.id` and persists the renumbered question/section graph.
- Guards: `surveys.write`, authenticated actor, missing survey/line, archived
  or stale parent row version, and 1-based position bounds reject before
  mutation. Odoo Surveys has no `company_id`, so company scope is not
  applicable.
- Verification: **3 focused tests / 20 assertions**; bounded adjacent
  question create/duplicate, speed-rating, and follower regression **15
  passed / 101 assertions**. Scoped ESLint and diff-check pass.
- Audit/discovery blocker: global audit and the broader discovery-based test
  stop on the unrelated concurrent Inventory API YAML parse error at
  `services/inventory/api/physical-inventory.yaml`. No full repository
  regression was run.
- Runtime/reference: ports 3000, 3001, 3390, 3391, and 8072 were closed;
  authenticated Core3 desktop/mobile and paired Odoo captures are unavailable.
  No visual or Odoo sign-off is claimed.

Evidence:
plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-QUESTION-REORDER-001/.

## Bounded QA run: `SURVEYS-QUESTION-EDIT-001` — 2026-09-21

- Source/UI: Odoo's `survey_question_form` edits `survey.question` title,
  question type, and ordered question metadata; the model persists `title`,
  `question_type`, and `sequence` and orders by `sequence,id`.
- Persistence/contracts: migration `0.0.65` adds question `row_version` and
  `updated_at`. `api/question-detail.yaml` owns the server form and
  `pages/question-detail.yaml` retains only the rendered header reference;
  both join at `page.id: survey-question-detail`.
- Guards: `surveys.write`, authenticated actor, missing question, archived or
  stale parent, stale question, title/type/sequence validation, and atomic
  parent/question version advancement are enforced. The Odoo source has no
  Survey `company_id`, so company scoping is not applicable.
- Verification: **3 focused tests / 24 assertions**, **12 adjacent question
  CRUD/reorder tests / 82 assertions**, and **23 broader Surveys integration
  tests / 220 assertions** pass. Audit reports **756 pages, 765 routes, and
  1,534 datasources**; scoped ESLint and diff-check pass.
- Runtime/reference: Core3 ports 3000, 3001, 3390, 3391 and Odoo port 8072
  were closed. Authenticated Core3 desktop/mobile and paired Odoo captures are
  unavailable; no visual or Odoo sign-off is claimed.

Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-QUESTION-EDIT-001/`.

## Bounded QA run: `SURVEYS-SUGGESTED-VALUE-EDIT-001` — 2026-09-21

- Source/UI: Odoo's Suggested Values action is a grouped `list,form` for
  `survey.question.answer`; the form edits value, sequence, score, and
  matrix metadata, while the model orders rows by `question_id, sequence, id`
  and limits labels to 90 characters.
- Persistence/contracts: migration `0.0.66` adds `updated_at`.
  `api/suggested-values.yaml` owns the edit server form and
  `pages/suggested-values.yaml` binds list open/double-click/menu actions;
  both join at `page.id: survey-suggested-values`.
- Guards: `surveys.write`, actor, missing answer, archived or stale survey,
  stale question/answer, supported question type, value length, sequence, and
  score guards execute before mutation. The Odoo source has no Survey
  `company_id`, so company scoping is not applicable.
- Verification: **3 focused tests / 27 assertions**, **15 adjacent question
  and suggested-value tests / 109 assertions**, and **23 broader Surveys
  integration tests / 220 assertions** pass. Audit reports **757 pages, 766
  routes, and 1,541 datasources**; scoped ESLint and diff-check pass.
- Runtime/reference: Core3 ports 3000, 3001, 3390, 3391 and Odoo port 8072
  were closed. Authenticated Core3 desktop/mobile and paired Odoo captures are
  unavailable; no visual or Odoo sign-off is claimed.

Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-SUGGESTED-VALUE-EDIT-001/`.

## Bounded QA run: `SURVEYS-SUGGESTED-VALUE-DELETE-001` — 2026-09-21

- Source/UI: Odoo's Suggested Values menu opens a `list,form` action for
  `survey.question.answer`; standard record deletion removes a label and the
  source relation uses cascading question deletes. The model orders labels by
  `question_id, sequence, id`.
- Persistence/contracts: `api/suggested-values.yaml` owns the delete action;
  `pages/suggested-values.yaml` exposes it only from the write-permissioned row
  menu; both join at `page.id: survey-suggested-values`. Migration `0.0.67`
  adds the deterministic ordering index.
- Guards: `surveys.write`, authenticated actor, missing answer, archived or
  stale survey, stale question/answer, and supported choice/multiple-choice/
  matrix type guards execute before the hard delete; question and survey row
  versions advance on success. Odoo Survey has no `company_id`, so company
  scoping is not applicable.
- Verification: **3 focused tests / 25 assertions**, **18 adjacent question
  and suggested-value tests / 134 assertions**, and **23 broader Surveys
  integration tests / 220 assertions** pass. Audit reports **758 pages, 767
  routes, and 1,544 datasources**; scoped ESLint and diff-check pass.
- Runtime/reference: Core3 ports 3000, 3001, 3390, 3391 and Odoo port 8072
  were closed. Authenticated Core3 desktop/mobile and paired Odoo captures
  are unavailable; no visual or Odoo sign-off is claimed.

Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-SUGGESTED-VALUE-DELETE-001/`.

## Bounded QA run: `SURVEYS-SUGGESTED-VALUE-REORDER-001` — 2026-09-21

- Source/UI: Odoo's Suggested Values list renders `sequence` with the handle
  widget and orders `survey.question.answer` records by `question_id,
  sequence, id`.
- Persistence/contracts: `api/suggested-values.yaml` owns the reorder server
  form and `pages/suggested-values.yaml` exposes the Reorder row action; both
  join at `page.id: survey-suggested-values`. Existing migration `0.0.67`
  provides the durable ordered lookup index; answer `sequence` and versions
  persist through file-backed restart.
- Guards: `surveys.write`, authenticated actor, missing answer, archived or
  stale survey, stale question/answer, supported choice/multiple-choice/
  matrix type, and question-scoped position bounds execute before renumbering.
  A successful reorder advances affected answers, the question, and survey.
  Odoo Survey has no `company_id`, so company scoping is not applicable.
- Verification: **3 focused tests / 27 assertions**, **21 adjacent question
  and suggested-value tests / 161 assertions**, and **23 broader Surveys
  integration tests / 220 assertions** pass. Audit reports **760 pages, 769
  routes, and 1,548 datasources**; scoped ESLint and diff-check pass.
- Runtime/reference: Core3 ports 3000, 3001, 3390, 3391 and Odoo port 8072
  were closed. Authenticated Core3 desktop/mobile and paired Odoo captures
  are unavailable; no visual or Odoo sign-off is claimed.

Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-SUGGESTED-VALUE-REORDER-001/`.

## Bounded QA run: `SURVEYS-SECTION-RANDOM-COUNT-001` — 2026-09-21

- Source/UI: Odoo stores `random_questions_count` on `survey.question` pages,
  shows it in the randomized section form, and samples that many questions
  from each section while retaining unsectioned questions.
- Persistence/contracts: migration `0.0.68` adds durable section count and a
  deterministic fixture. `api/survey-detail.yaml` owns the server form and
  `pages/survey-detail.yaml` owns the Questions grid action; both join at
  `page.id: survey-detail`. The public operation and route persist the sampled
  `question_order`.
- Guards: `surveys.write`, actor, missing row, section-only type, archived or
  changed parent, stale section, and 0..100 count validation execute before
  the atomic update. Odoo Survey has no `company_id`, so company scoping is
  not applicable.
- Verification: **3 focused tests / 34 assertions**, **17 adjacent tests /
  159 assertions**, and **23 broader Surveys tests / 220 assertions** pass.
  Audit reports **764 pages, 773 routes, and 1,555 datasources**; scoped
  ESLint and diff-check pass.
- Runtime/reference: ports 3000, 3001, 3390, 3391, and 8072 were closed or
  unreachable. Authenticated Core3 desktop/mobile and paired Odoo captures
  are unavailable; no visual or Odoo sign-off is claimed.

Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-SECTION-RANDOM-COUNT-001/`.

## Bounded QA run: `SURVEYS-SUGGESTED-VALUE-CREATE-001` — 2026-09-21

- Source/UI: Odoo's `survey.question.answer` model stores preconfigured
  choice/multiple-choice/matrix labels, orders them by question and sequence,
  and the Suggested Values list/form action supports the New lifecycle.
- Persistence/contracts: migration `0.0.69` adds a deterministic choice
  fixture. `api/suggested-values.yaml` owns the server form and
  `pages/suggested-values.yaml` retains only the list presentation and
  `create_action`; both join at `page.id: survey-suggested-values`.
- Guards: `surveys.write`, actor, missing question, duplicate request key,
  archived or changed parent, stale question, supported question type, value
  length, sequence, and score are enforced before the atomic insert. The
  inspected Odoo Survey source has no `company_id`, so company scoping is not
  applicable.
- Verification: **3 focused tests / 22 assertions**, **41 neighboring tests /
  367 assertions**, and full Surveys **198 passed / 4 known migration rollback
  failures / 1,668 assertions**. Audit reports **766 pages, 775 routes, and
  1,562 datasources**; scoped ESLint and diff-check pass.
- Runtime/reference: Core3 3000/3001/3390/3391 and disposable Odoo 8072 were
  unreachable. Odoo 8069/8073 were reachable only at the login shell;
  Playwright captured the redirect at both target viewports. No authenticated
  Core3/Odoo comparison or sign-off is claimed.

Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-SUGGESTED-VALUE-CREATE-001/`.
