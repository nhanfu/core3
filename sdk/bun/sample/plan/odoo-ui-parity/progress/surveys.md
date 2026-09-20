# surveys parity progress

Module owner: surveys module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: `f7b9a24e7100e0821688ef006dec187212bb36de`

## Bounded QA rerun: f7b9a24e (2026-09-13)

Migration repair passes on fresh DuckDB: latest `0.0.17` had all three response indexes; rollback to `0.0.16` preserved a submitted response and both dependent earlier indexes; upgrade and two replays restored `0.0.17`, retained data, and left 17 migration rows. Candidate migration tests: 2/2 pass. Nonexistent target `9.9.9` is accepted as a no-op by the migration runner and is recorded as a framework finding.

Focused Surveys glob: 33 pass / 3 fail / 292 assertions across 36 tests. All three failures are the same unrelated discovery error, `components[0].activity_complete_action is not allowed`, in catalog/delete/invite tests. `bun run audit` fails on that same key; scoped `git diff --check` passes. Full repository regression was stopped on request after an unrelated `sales_orders_to_upsell` 30-second timeout; no full-suite pass is claimed.

Fresh module HTTP/browser probe: public `/surveys` returned 200; authenticated headless desktop 1440x900 and mobile 390x844 reached `/surveys` with zero page/request errors and no overflow, but empty body. Screenshots: `/tmp/core3-qa-surveys-f7b9-desktop.png` and `/tmp/core3-qa-surveys-f7b9-mobile.png`. No Odoo visual comparison or sign-off.

Status remains **qa-in-progress / blocked**, with migration repair verified but schema/audit, full regression, authenticated render, and paired Odoo evidence open.

## 2026-09-20 — `SURVEYS-QUESTION-CREATE-001`

Selected the smallest unfinished source-backed form workflow: Odoo's
Questions-tab inline `Add a question` control. Core3 implementation is complete
in the page/API pair `survey-detail`, with `surveys.write` permission,
parent-scoped ordered persistence, deterministic defaults, stale/archive and
validation guards, and file-backed restart coverage. Focused test result is
3/3 passing with 17 assertions. Authenticated Core3 desktop/mobile evidence
and truthful authenticated Odoo fallback captures are recorded under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-QUESTION-CREATE-001/`.
The current Odoo reference database has Surveys uninstalled, so this feature is
not visually signed off against Odoo. Overall module status remains
**qa-in-progress / conditional**.

## 2026-09-20 — `SURVEYS-LIVE-SESSION-JOIN-001`

Selected the smallest remaining source-backed live behavior: public access
code join/rejoin before attendee answer submission. Core3 now persists a
deterministic attendee token and join key, distinguishes Ready/Waiting from
In Progress/current-question state, rejects closed/certification/invalid
codes, and exposes the page/API contracts with `surveys.read` and
`surveys.public` boundaries. The file-backed restart test returns the same
token after reopen; DuckDB migration rollback now removes dependent indexes
before dropping the new columns.

The full Surveys suite is green at 58 tests and 461 assertions. Fresh
authenticated Core3 desktop/mobile probes joined the Feedback session at
1440x1000 and 390x844 with no overflow. Authenticated Odoo desktop/mobile
probes reached `/s/5822`; its exact JSON-RPC validator returned
`{\"error\":\"survey_wrong\"}` because no matching reference live session
exists. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-LIVE-SESSION-JOIN-001/`.
Status remains **qa-in-progress / conditional**; no full-module sign-off is
claimed.

## 2026-09-21 — `SURVEYS-PUBLIC-ANSWER-VALIDATION-001`

Selected the smallest remaining source-backed public question behavior after
live-session rendering: Odoo's `survey_submit` question validation. Core3 now
validates Choice, Rating, Multiple Choice, and Numerical values before public
progress or submit mutations while retaining the existing YAML page/API
contracts, token scope, and permission boundary. Invalid values return
`SURVEY_PUBLIC_ANSWER_INVALID` with HTTP 422 and leave the durable response
unchanged; valid values persist, survive file-backed reopen, and submit/replay
through the existing idempotency flow.

Focused coverage is **11 passed / 98 assertions** across public validation,
response, and next/previous navigation tests. Authenticated Core3 desktop/mobile
probes observed the invalid 422 without mutation and then rendered a valid
Question 1 → Question 2 transition. Odoo's route was reachable at both
viewports but remained on the host-session waiting state, so no invalid-answer
mutation parity is claimed. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-ANSWER-VALIDATION-001/`.
Status remains **qa-in-progress / conditional**; full repository regression was
not run.

## 2026-09-21 — `SURVEYS-PUBLIC-DEADLINE-001`

Selected the smallest remaining public expired-link behavior after answer
validation: Odoo's `answer_deadline` validity guard. Core3 now stores a
response deadline durably, projects it through public operations, adds HTTP-410
YAML guards for progress/submit/next/previous, and applies the same token guard
before public read/start/retry. The deterministic expired fixture is
`expired-public-answer-token-2026`; active responses remain editable and retain
their deadline after file-backed restart.

Focused verification is **3 passed / 25 assertions** in
`test/surveys_public_deadline.integration.test.ts`. The authenticated Core3
desktop/mobile probe was blocked before serving by the shared runtime's exact
discovery error `PageSchemaError: actions[4].fields is not allowed`; no
screenshot or Odoo deadline sign-off is claimed. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-DEADLINE-001/`.
Status remains **qa-in-progress / conditional**.

## 2026-09-21 — `SURVEYS-LIVE-SESSION-PREVIOUS-001`

Selected the smallest remaining source-backed session behavior after the
public session and answer slices: Odoo's authenticated
`/survey/session/next_question/<survey_token>` accepts `go_back` and moves the
host cursor to the previous ordered question. Core3 now exposes the matching
`previous_live_session_question` action in the existing `survey-live-session`
page/API pair. It is restricted to `surveys.manage`, requires an in-progress
session and matching `row_version`, rejects the first-question boundary, and
persists the previous question/text/start timestamp before refreshing both
session data sources.

Focused verification is **3 passed / 13 assertions** in
`test/surveys_live_session_previous.integration.test.ts`; the adjacent live
session suites pass **15 tests / 107 assertions**. The full Surveys glob
reaches **76 passed / 6 failed / 630 assertions**; the failures are four
existing DuckDB rollback dependent-entry cases, one test-entry fixture-count
failure, and a shared Employee page-schema discovery failure, none in this
slice.
Scoped ESLint, `bun run audit` (**692 pages / 701 routes / 1,290
datasources**), and `git diff --check` pass.

Core3 desktop/mobile evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-LIVE-SESSION-PREVIOUS-001/`.
The fresh authenticated frontend listed the Surveys route but the backend
returned `404 {"error":"Unknown page: survey-live-session"}` because its
current page registry exposed only Blog pages; no Core3 visual sign-off is
claimed. Odoo desktop/mobile `/s/5822` returned HTTP 200, while the exact
session-code validator returned `{"error":"survey_wrong"}` and no matching
live-session fixture exists. No paired Odoo workflow or visual sign-off is
claimed. Overall Surveys remains **qa-in-progress / conditional**.

## 2026-09-20 — `SURVEYS-LIVE-SESSION-ANSWER-001`

Selected the smallest remaining source-backed behavior after Live Session Join:
an attendee submits one answer for the host's current question. Core3 adds a
separate permissioned YAML mutation and public route, validates session,
attendee token, current question, and answer options, persists the answer and
score, updates session counters, and replays an existing current-question
answer without inserting a duplicate. Migration `0.0.21` adds the durable
unique boundary. Focused CRUD/permission/restart coverage is green at 2/2
tests and 23 assertions; the full Surveys glob is 60/60 with 484 assertions.

Authenticated Core3 desktop/mobile probes rendered the submitted answer with
zero failed requests and no overflow. The authenticated Odoo reference has no
matching live session: `/survey/check_session_code/5822` returned HTTP 200
JSON-RPC `{"error":"survey_wrong"}`. Exact screenshots and JSON are under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-LIVE-SESSION-ANSWER-001/`.
Status remains **qa-in-progress / conditional**; no module sign-off is
claimed.

## 2026-09-21 — `SURVEYS-PUBLIC-END-MESSAGE-001`

Selected the next uncovered source-backed public behavior after scoring:
Odoo's durable `survey.survey.description_done` completion message. Core3
adds migration `0.0.25`, exposes `description_done` from the public survey
detail operation, and renders the configured message after submit and on a
submitted-response restart. The submit path retains `surveys.public`, token,
state, deadline, and idempotency guards.

Focused end-message plus adjacent public regression coverage passes. Fresh
authenticated Core3 desktop/mobile login and `/api/auth/me` pass, while the
shared runtime returns 404 `API route not found` for the authenticated public
API and 401 for the rendered public route. Odoo redirects the public token to
login, so no installed Survey completion fixture is available. Evidence is
under `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-END-MESSAGE-001/`;
status remains **qa-in-progress / conditional**, with no sign-off claimed.

## 2026-09-21 — `SURVEYS-PUBLIC-SCORING-001`

Selected the next uncovered source-backed public participant behavior after
cookie resume: Odoo's stored public score and quiz-pass result. Core3 adds
`survey.public.scoring_answers`, calculates deterministic suggested-answer
percentage scoring (including multiple-choice positive-score sums), persists
`score` and `quiz_passed` when a token-scoped response is submitted, and
returns them on resume/idempotency reads. A concurrent losing submit replays
the committed idempotency row after the observed DuckDB transaction conflict.

Focused scoring/restart/concurrency/token tests pass. Authenticated Core3
desktop/mobile login and `/api/auth/me` pass, but the shared runtime returns
404 `API route not found` for the authenticated public API and 401 for the
rendered `/survey/start/<token>` route. Odoo redirects the token to the login
page, so an installed Survey result fixture is unavailable. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-SCORING-001/`;
status remains **qa-in-progress / conditional**, with no sign-off claimed.

## 2026-09-21 — `SURVEYS-PUBLIC-COOKIE-RESUME-001`

Selected the next source-backed public lifecycle after section filtering:
Odoo's `survey_start` cookie resume. Core3 now sets and reads the durable
`survey_<survey_token>` cookie, gives explicit answer tokens precedence,
ignores malformed/stale cookies without disclosing response data, and refreshes
the cookie on start/begin/replay paths. The separate API action declares the
optional answer token and remains joined to the admin page through
`page.id: surveys`.

Focused verification is 3/3 for the new test and 24/24 across the adjacent
public regression set, including concurrent replay and file-backed restart.
Authenticated Core3 login succeeded at desktop/mobile, but the fresh runtime
returned public API 404/anonymous 401 because its Surveys public route was not
registered; exact JSON and screenshots are in the feature evidence directory.
Odoo returned HTTP 200 at both viewports with the host-controlled Feedback Form
waiting state, not a mutable participant response. No visual or paired Odoo
sign-off is claimed. Status remains **qa-in-progress / conditional**.

## 2026-09-21 — `SURVEYS-PUBLIC-SECTIONS-001`

Selected the next uncovered source-backed public question behavior after the
begin transition: Odoo's `is_page` section boundary. Odoo keeps sections in
the ordered survey graph but renders them as page headings rather than
answerable questions. Core3 now filters `is_page` rows from the public
question catalog and durable first/current/next/previous cursor operations.
The existing `surveys` page and public API remain joined by `page.id`, and all
public actions retain `surveys.public` permission. Concurrent next-question
writes replay the committed navigation key; restart coverage preserves one
answerable cursor and one response row.

`surveys_public_sections.integration.test.ts` passes 3 tests / 27 assertions.
The broader public regression set passes 21 tests / 180 assertions. Evidence
is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-SECTIONS-001/`.

Fresh authenticated Core3 desktop/mobile probes rendered exact `API route not
found` from the shared runtime for the synthetic conditional token. Odoo 8069
redirected both viewports to `/web/login?redirect=%2Fodoo%3F` because that
fixture is unavailable. No browser or paired Odoo sign-off is claimed;
Surveys remains **qa-in-progress / conditional**.

## 2026-09-21 — `SURVEYS-PUBLIC-BEGIN-001`

Selected the next uncovered source-backed public lifecycle after test entry:
Odoo's `survey_begin` transition for an existing `New` answer token. The
separate `public_survey_begin` YAML action now moves the durable response to
`In Progress`, assigns the first question cursor, and keeps the existing
public start page/API separation. `surveys.public`, survey/answer-token,
deadline, first-question, and already-started guards are explicit. A bounded
retry observes a concurrent winner and replays the committed response without
creating another row.

`surveys_public_begin.integration.test.ts` passes 3 tests / 14 assertions,
including YAML contract, concurrent begin, file-backed reopen, submitted
boundary, and unchanged snapshot checks. The adjacent public workflow set
passes 13 tests / 108 assertions. The pre-existing test-entry fixture-count
failure remains outside this slice. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-BEGIN-001/`.

The shared Core3 runtime returned HTTP 401 for unauthenticated desktop/mobile
public probes and HTTP 404 `API route not found` for authenticated direct
public calls; its Surveys route registry was not available for visual proof.
Odoo 8069 returned HTTP 200 to both desktop/mobile probes but remained in the
host-controlled Feedback Form waiting state, while disposable 8072 returned
`ERR_CONNECTION_REFUSED`. No browser or paired Odoo sign-off is claimed;
Surveys remains **qa-in-progress / conditional**.

## 2026-09-21 — `SURVEYS-PUBLIC-LIVE-SESSION-001`

Selected the smallest unfinished source-backed session behavior after public
question navigation: Odoo's public `/s/<session_code>` participant surface.
The existing `pages/live-session-join.yaml` and
`api/live-session-join.yaml` remain the page/API source of truth; Core3 now
binds them to `public/components/PublicLiveSession.ts` through `public/app.ts`.
The renderer owns code entry, token-scoped join, Ready/waiting state, current
question answer submission, refresh, and durable answered state after reload.

Focused join/answer/renderer verification is **7 passed / 64 assertions**;
scoped ESLint and `git diff --check` pass. Authenticated Admin Core3 desktop
and mobile probes at 1440x900 and 390x844 joined session `5822`, submitted
rating `5`, reloaded, and showed the persisted answer with no failed browser
requests or horizontal overflow. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-LIVE-SESSION-001/`.
The Odoo disposable reference at `127.0.0.1:8072` refused both `/s/5822`
probes; no Odoo sign-off is claimed. Full repository regression was not run.

## 2026-09-20 — `SURVEYS-PUBLIC-PREVIOUS-QUESTION-001`

Selected the smallest remaining source-backed public navigation behavior after
the renderer binding: Odoo's previous-page path in
`addons/survey/controllers/main.py:583-587`. Core3 adds a separate YAML API
action and operation, persists the public response cursor, and binds the
rendered Back control to the token-scoped transition. Guards cover permission,
wrong token, stale cursor, closed state, invalid ordering, non-POST, and the
first-question boundary; the navigation key is replay-safe across a
file-backed DuckDB reopen.

The focused next/previous suite passes **6 tests / 44 assertions**. Scoped
ESLint, `bun run audit` (**687 pages, 696 routes, 1,279 datasources**), and
`git diff --check` pass. Authenticated Core3 desktop/mobile probes render
Question 2 → Back → Question 1, restore Question 1 after reload, replay with
HTTP 200/`replayed: true`, and report zero console/page failures. Evidence is
under `plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-PUBLIC-PREVIOUS-QUESTION-001/`.
The installed Odoo reference remains blocked by the absence of a stable active
answer-token fixture for this mutation; no Odoo sign-off is claimed.

## 2026-09-20 — `SURVEYS-PUBLIC-NEXT-QUESTION-002`

Closed the integration gap exposed by the previous cursor slice. Ownership
tracing confirmed `public/app.ts` directly mounts the Surveys-history
`public/components/PublicSurvey.ts`; the renderer now consumes
`answer.current_question_id`, calls the durable next-question API after saving
progress, uses a deterministic navigation key, renders the returned question,
and restores it after reload. Focused verification is 3 tests / 24 assertions.

Fresh authenticated Admin desktop/mobile probes at 1440x900 and 390x844 show
Question 1 → Question 2, replay `replayed: true`, durable Question 2 after
reload, zero failed requests, and no horizontal overflow. Odoo source
comparison remains recorded, but the installed reference lacks a stable active
answer-token fixture for a live paired mutation probe. Status remains
**qa-in-progress / conditional**.

## 2026-09-20 — `SURVEYS-PUBLIC-NEXT-QUESTION-001`

Selected the smallest unfinished source-backed public lifecycle after the
authenticated test-entry slice: Odoo's next-question navigation route. Core3
now persists `survey_responses.current_question_id` and `navigation_key`,
advances one ordered question through a separate YAML API action, and replays
the same navigation key without creating another response or cursor write.
Wrong token, stale cursor, invalid ordering, final question, closed response,
and non-POST requests are guarded. Migration replay/rollback and file-backed
restart coverage are included.

Focused next-question coverage is 3 tests / 19 assertions; migration repair
coverage is 7 tests / 34 assertions; the full Surveys glob is 69 tests / 554
assertions. Scoped ESLint, `git diff --check`, and the UI audit pass at 684
pages, 693 routes, and 1,264 datasources. Core3 desktop/mobile probes reached
the public page and returned API advancement to
`question-feedback-comment` with zero failed requests and no overflow. The
existing public page component does not consume the new cursor on reload and
is outside this owner's permitted paths; that UI integration gap is recorded
precisely in the evidence. Odoo's installed reference lacks a stable active
answer-token fixture for a live paired mutation probe, so no Odoo sign-off is
claimed. Status remains **qa-in-progress / conditional**.

## 2026-09-20 — `SURVEYS-LIVE-LEADERBOARD-001`

Selected the smallest remaining source-backed live-session behavior after the
Results Print slice: the authenticated host leaderboard while a session is in
progress. Core3 now exposes a durable, permissioned leaderboard datasource
with deterministic score ordering and an authenticated host action from the
live-session page. Empty, closed, and missing fixture states return no rows;
the file-backed restart test confirms attendee names, scores, and positions
survive migration replay.

The focused feature test passes 3/3 with 25 assertions, and the full Surveys
glob passes 55/55 with 436 assertions. Core3 desktop/mobile probes show the
leaderboard action and Nora/Omar ranked rows without horizontal overflow. The
authenticated Odoo reference session is reachable on desktop/mobile, but its
leaderboard JSON-RPC result is empty because the active session has no attendee
attempts and `session_show_leaderboard=false`; exact blocker evidence is in
the feature evidence directory. Status remains **qa-in-progress /
conditional**; this slice does not sign off the full module.

## 2026-09-20 — `SURVEYS-RESULTS-PRINT-001`

Selected the smallest remaining source-backed results behavior: Odoo's
authenticated Survey Results `Print` action. Core3 now keeps the results page
layout and API/action contract separate, exposes a permissioned Print header
action, records a filtered report-run row in durable
`survey_results_print_runs`, and refreshes the result sources after the
mutation. The report derives deterministic survey/response/question counts,
uses fixed timestamps and IDs, and rejects missing surveys, actor mismatch,
invalid filters, and stale/replayed requests without partial writes.

`surveys_results_print.integration.test.ts` covers page/API discovery,
filtered Completed+Passed counts, migration replay, file-backed restart, and
the permission/validation guard matrix. The focused Surveys suite is green;
the full repository run completed with three unrelated concurrent
eCommerce/CRM fixture-order failures and no Surveys failure. Authenticated
Core3 and Odoo desktop/mobile Print evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-RESULTS-PRINT-001/`.
The disposable Odoo proxy on port 8072 was connection-refused, while the
authenticated Odoo 8069 reference route `/survey/results/feedback-form-1`
provided paired results/Print captures. This slice remains
**qa-in-progress / conditional**; no module sign-off is claimed.

## 2026-09-20 — `SURVEYS-PARTICIPANT-INVITE-001`

Completed the next bounded source-backed participant workflow after the
rollback and actor-matrix gates: Admin send for a New participant and resend
for an In Progress participant. The API now has explicit state, email, and
stale-replay guards, deterministic invitation timestamps, durable invitation
counts/state, and `surveys.write` protection. Focused CRUD/permission/restart
coverage is green, and fresh authenticated Core3 desktop/mobile evidence is
captured.

The live authenticated Odoo reference is installed but has only Completed
participant fixtures in the Participants action; consequently its New/In
Progress resend action cannot be exercised. This is recorded as the precise
paired-comparison blocker. Status remains **qa-in-progress / conditional**.

## Current state

The focused Surveys suite passes 34 tests with 305 assertions across five files,
including keyed public start/submit retry behavior with single response rows
and counts. Fresh module-scoped public and authenticated browser probes at
1440x900 and 390x844 passed with no page/request errors or horizontal overflow;
captures are `/tmp/core3-qa-surveys-public-start-desktop.png`,
`/tmp/core3-qa-surveys-public-start-mobile.png`,
`/tmp/core3-qa-surveys-auth-desktop.png`, and
`/tmp/core3-qa-surveys-auth-mobile.png`. Required-answer submission returned
422 without mutation, Fleet was denied `surveys.read` with 403, and invalid
public API tokens returned 404 without disclosure. Forward migration
apply/reapply is stable (17 migration rows, 5 seeded responses, one
idempotency column on both runs). An exploratory full-chain DuckDB rollback to
`0.0.16` is blocked by dependent entries preventing alteration of
`survey_responses`. Audit and scoped diff-check pass. The full repository suite
was started but interrupted at the user's request before completion; no
full-suite pass is claimed. The
module-scoped authenticated process passed 28/28 route checks across 14 routes
at desktop and mobile sizes, and Fleet was denied `surveys.read` with HTTP 403.
The shared process on port 3002 was stale and returned page 404s; it needs a
fresh-process retest. A fresh authenticated lifecycle probe persisted a survey
and question, then moved Draft → Published → Closed → Archived → Draft with
row versions 1 → 5. Paired Odoo comparison remains open. No parity claim is
made here.

## Next bounded task

Resolve the DuckDB migration rollback/dependent-entry blocker, complete the
full repository regression, then repeat the complete actor mutation matrix and
paired Odoo desktop/mobile comparison. This bounded QA run does not sign off
the module.

## 2026-09-20 — `SURVEYS-MIGRATION-ROLLBACK-001`

Revalidated and strengthened the DuckDB rollback/dependent-entry repair with an
access-token-bearing response regression. Migration tests pass 4/4, the full
Surveys glob passes 45/45, and the full repository run completed 1,379 pass / 3
fail; all failures are concurrent CRM/Ecommerce expectations outside Surveys.
Authenticated Core3 Admin desktop/mobile and Fleet permission-denial evidence,
alongside authenticated Odoo desktop/mobile fallback evidence, is recorded in
the feature evidence directory. The gate repair is complete; module status
remains **qa-in-progress / conditional**, with no Odoo Surveys visual sign-off
because the live reference database is uninstalled.

## 2026-09-20 — `SURVEYS-ACTOR-MATRIX-001`

Completed the next bounded lifecycle check after the rollback gate: the
authenticated Administrator/Fleet/anonymous actor mutation matrix around
Survey-detail inline question creation. Admin created and reloaded durable
questions from fresh desktop and mobile browsers; Fleet was denied the
catalog with 403 and anonymous navigation redirected to login. Service-level
CRUD, permission, and restart coverage remains green. Full repository
regression was rerun, with only concurrent invalid page-filter YAML and
Inventory DuckDB migration failures outside Surveys. Odoo was authenticated
but Surveys is uninstalled in `core3_reference`, so desktop/mobile fallback
captures are recorded and no paired Odoo sign-off is claimed. Status remains
**qa-in-progress / conditional**.

## 2026-09-20 — `SURVEYS-PUBLIC-RESPONSE-RESTART-001`

Selected the smallest remaining source-backed public behavior after participant
invitation coverage: start a published token, save an answer, restart the
file-backed database, resume, submit, and replay the same submission safely.
Public actions were moved from the page fragment into `api/surveys.yaml`,
declared with `surveys.public`, and guarded by survey/answer-token and
in-progress-state checks. Submit uses a deterministic timestamp so restart and
replay assertions are stable.

`surveys_public_response.integration.test.ts` and the new restart integration
test cover public permission declarations, required-answer and stale-token
boundaries, durable resume, response-count persistence, and idempotent submit.
Fresh authenticated Core3 desktop/mobile captures reach “Thank you / Your
answers have been submitted” with no horizontal overflow. Authenticated Odoo
comparison reaches the valid Feedback Form but is blocked before questions by
the host-controlled session state; exact captures and text are in the feature
evidence directory. Full Surveys verification is 50/50 with 410 assertions;
the repository audit passes and the full repository run is 1,430 pass / 4
unrelated concurrent eCommerce/CRM failures. Status remains
**qa-in-progress / conditional**.

## 2026-09-20 — `SURVEYS-PUBLIC-RETRY-001`

Selected the smallest unfinished source-backed public behavior after Live
Session Answers: Odoo's completed-response `survey_retry` route. Core3 now
creates a deterministic durable in-progress retry response, preserves
respondent/test context, returns a new public start URL, and replays an
idempotency key without creating a second row. Existing progress/submit APIs
continue the new token, and a file-backed DuckDB reopen preserves it. The
public submit path was repaired to omit absent optional fields so retry
submissions without respondent metadata do not bind undefined DuckDB values.

Focused retry coverage is 3 tests and 24 assertions. Authenticated Core3
desktop/mobile browser checks passed with zero failed requests and no
horizontal overflow. The authenticated Odoo reference retry route returned
HTTP 200 `Survey Access Error` for the valid completed Feedback attempt; exact
body text and screenshots are recorded under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-PUBLIC-RETRY-001/`.
This is a Core3 bounded pass with a conditional Odoo comparison; no module
sign-off is claimed.

## 2026-09-20 — `SURVEYS-TEST-ENTRY-001`

Selected the smallest remaining source-backed action after public retry:
Odoo's authenticated Test Survey launch. Core3's separate `survey-test` page
and API now expose explicit token/state/question guards, `surveys.write`
permission, and a stable per-survey launch key. The deterministic test-entry
row resets idempotently instead of creating duplicate browser fixtures and
survives file-backed DuckDB reopen.

Focused coverage is 3 tests with 27 assertions; the full Surveys glob is 66
tests with 535 assertions. Authenticated Core3 and Odoo desktop/mobile probes
both reached the Test Survey Entry landing state at 1440x900 and 390x844 with
matching viewport widths. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-TEST-ENTRY-001/`.
Status remains **qa-in-progress / conditional**; no module sign-off is
claimed.
