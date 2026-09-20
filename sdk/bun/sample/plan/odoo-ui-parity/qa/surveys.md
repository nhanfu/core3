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
