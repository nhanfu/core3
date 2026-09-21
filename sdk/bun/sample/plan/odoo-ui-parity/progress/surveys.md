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

## 2026-09-21 — `SURVEYS-PUBLIC-QUESTION-IMAGE-001`

Selected Odoo's next uncovered public helper after the completed background and
question-type slices: suggested-answer image delivery. Migration `0.0.35`
adds durable image content and a separate published `Image Choice Survey`;
`survey.public.question_image` enforces published survey, answer-token,
question, suggested-answer, and response-state ownership before returning the
SVG. The paired `surveys.public` API action is bound to the existing
`page.id: surveys` contract, and `PublicSurvey.ts` renders image-backed Choice
options after a normal Start flow.

Focused image/background checks pass 4/4 with 44 assertions; the focused
integration trio passes 27/27 with 264 assertions; the public/core Surveys
regression passes 75/75 with 682 assertions. Scoped lint and diff-check pass.
After the shared Inventory page boundary was repaired, Core3 authenticated
desktop/mobile evidence passed at 1440x900 and 390x844; the image returned
HTTP 200 `image/svg+xml` with no request/page failures or horizontal overflow.
The repository audit passes with 716 pages, 725 routes, and 1370 datasources.
Odoo desktop/mobile redirect to login and proxy 8072 refuses; no paired Odoo
fixture or module sign-off is claimed. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-QUESTION-IMAGE-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-BACKGROUND-001`

Selected the next uncovered Odoo public helper behavior after the excluded
question-type and public-flow slices: survey background image delivery. The
new `0.0.33` migration persists a deterministic published fixture's background
URL and SVG content. The paired API/page contract exposes a `surveys.public`-
guarded asset action, the module serves the published token-scoped asset at
`/api/public/surveys/<token>/background`, and `PublicSurvey.ts` applies only a
validated same-origin URL to the public frame.

Focused lifecycle coverage is 2/2 tests with 23 assertions, including restart,
asset replay, malformed/foreign/unpublished token, method, and YAML contract
guards. The module regression is 107 passed / 5 failed / 898 assertions; the
five failures are the known migration rollback dependent-entry tests and stale
Test Entry fixture expectation. Audit and scoped lint/diff-check pass.

Authenticated Core3 desktop/mobile evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-BACKGROUND-001/`.
Odoo desktop/mobile remain blocked at the login form; port 8072 is refused.
Status remains **qa-in-progress / conditional** with no sign-off claim.

## 2026-09-21 — `SURVEYS-PUBLIC-IDENTITY-001`

Selected the next uncovered source-backed public behavior after the completed
question-type and comments slices: Odoo's stored `save_as_email` and
`save_as_nickname` respondent identity flags. Core3 migration `0.0.32` adds the
durable question metadata and deterministic published `Contact Details`
fixture. The public API operation exposes both flags through the existing
`page.id: surveys` YAML pair; progress and submit derive the configured answer
into `survey_responses.respondent_email` or `respondent_name` without losing
the original answer JSON. The renderer uses email/nickname controls.

Focused identity coverage is 2 tests with 19 assertions. The public Surveys
regression is 71 passed with 638 assertions. Authenticated Core3 desktop/mobile
probes on Vite 3391/backend 3390 show the admin catalog, both identity inputs,
API 200 flags, no request/page failures, and no horizontal overflow. Evidence
is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-IDENTITY-001/`.

The broad Surveys run reproduced four existing DuckDB rollback failures with
`Cannot alter entry "survey_questions" because there are entries that depend
on it`; the lingering process was stopped after bounded reproduction. Odoo
8069 redirected both viewports to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`,
and disposable proxy 8072 refused the connection, so no paired Odoo identity
fixture or sign-off is claimed. Status remains **qa-in-progress / conditional**.

## 2026-09-21 — `SURVEYS-PUBLIC-COMMENTS-001`

Selected the next uncovered source-backed public behavior after the completed
conditional-question slice: Odoo choice-question comments. Core3 migration
`0.0.31` adds durable comment settings and a deterministic published
`SURVEY/COMMENTS` fixture. The separate public API metadata operation feeds
the page-bound renderer; comments persist as question-scoped answer-data
entries, and `comment_count_as_answer` allows a required choice to be
completed by a comment alone. Comments on questions without the source flag
are rejected before mutation.

Focused coverage is **2 tests / 21 assertions**; the public regression is
**46 tests / 399 assertions**. It covers `surveys.public`, wrong tokens,
comment-only required completion, concurrent idempotency, restart persistence,
and the disallowed-comment boundary. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-COMMENTS-001/`.

The historical migration rollback gate remains blocked by DuckDB's
`Cannot alter entry "survey_questions" because there are entries that depend
on it`. Fresh Core3 desktop/mobile probes recorded HTTP 502 because the
backend did not expose `/api/modules`; Odoo redirected to the login route
without an installed authenticated Survey fixture. No parity or module
sign-off is claimed.

## 2026-09-21 — `SURVEYS-PUBLIC-CONDITIONAL-QUESTION-001`

Selected the next uncovered source-backed public behavior after the completed
begin, sections, cookie resume, scoring, completion, date/datetime/scale/
matrix, live-session, deadline, answer-validation, and renderer navigation
slices: Odoo conditional question visibility. Core3 adds migration `0.0.30`
with a durable trigger relation and deterministic `SURVEY/BRANCHING` fixture;
the public catalog, navigation, progress, and submit paths evaluate the
token's durable answer data. The renderer now accepts a conditional question
returned by next/previous navigation and merges it into the sorted question
list, so the new API is connected to the rendered route.

Focused coverage is **2 tests / 25 assertions**; the public regression is
**44 tests / 376 assertions**. It includes wrong-token and public-permission
guards, hidden-question skip/show behavior, concurrent idempotent submit, and
file-backed restart. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-CONDITIONAL-QUESTION-001/`.

The full migration rollback gate remains blocked by DuckDB's
`Cannot alter entry "surveys" because there are entries that depend on it`;
`bun run audit` remains blocked by a concurrent non-Surveys page-schema error.
Fresh Core3 desktop/mobile probes recorded the backend-not-ready 502; Odoo
redirected to `/web/login?redirect=%2Fodoo%3F` and supplied no installed
authenticated Survey fixture. No parity or module sign-off is claimed.

## 2026-09-21 — `SURVEYS-PUBLIC-SCALE-QUESTION-001`

Selected the smallest uncovered source-backed public question behavior after
the completed Date and Datetime slices: Odoo's Scale question. Core3 adds
deterministic optional fixture `question-certification-scale`, renders its
durable 0–10 option range as radio choices, and rejects out-of-range values
before public progress or submit mutates answer JSON. The paired page/API
contract remains joined by `page.id: surveys`, and both mutations retain
`surveys.public`.

Focused verification passes 2/2 tests with 20 assertions, covering invalid
scale no-mutation, valid persistence, file-backed DuckDB restart, concurrent
idempotent submit, response-count durability, and wrong-token rejection. The
adjacent public regression passes 40/40 tests with 331 assertions. The fresh
Core3 process could not start because the shared runtime rejected
`components[0].search.categories` and `components[0].search.or locations...`;
Odoo 8069 redirected both viewports to its login page. Status remains
**qa-in-progress / conditional**; no module sign-off is claimed.

## 2026-09-21 — `SURVEYS-PUBLIC-DATETIME-QUESTION-001`

Selected the smallest uncovered source-backed public question behavior after
the Date slice: Odoo's `datetime` question parser. Core3 adds deterministic
optional fixture `question-certification-datetime`, renders a custom
`YYYY-MM-DD HH:MM:SS` input, and validates calendar/time components before
public progress or submit mutates durable answer JSON. The paired page/API
contract remains joined by `page.id: surveys`, and both mutations retain
`surveys.public`.

Focused verification passes 2/2 tests with 21 assertions, covering impossible
datetime no-mutation, valid persistence, file-backed DuckDB restart, concurrent
idempotent submit, response-count durability, and wrong-token rejection. The
adjacent public regression passes 38/38 tests with 311 assertions. Authenticated
Core3 desktop/mobile probes recorded login/me 200, public API 404
`API route not found`, rendered body `Unauthorized`, no overflow, and no failed
requests. Odoo 8069 returned its login redirect at both viewports; no
authenticated installed Survey Datetime fixture exists. Status remains
**qa-in-progress / conditional**; no module sign-off is claimed.

## 2026-09-21 — `SURVEYS-PUBLIC-MATRIX-QUESTION-001`

Selected the next uncovered source-backed public question behavior after the
completed Date, Datetime, and Scale slices: Odoo Matrix answers. Core3 adds a
deterministic certification Matrix question with source-defined row/column
labels, projects the metadata through the separate `surveys` page/API pair,
renders the responsive table, and persists a row-to-column answer map.

Token-scoped public progress and submit reject foreign rows, foreign columns,
duplicate cells, and malformed values before mutation. The focused test also
proves file-backed restart, wrong-token denial, and concurrent submit replay.
Focused verification is **2/2 tests, 22 assertions**; the public regression is
**42/42 tests, 353 assertions**. ESLint, audit, and scoped diff-check passed.

Core3 desktop/mobile browser probes record connection refusal because the fresh
backend did not expose port 4340 during the bounded readiness window. Odoo
desktop/mobile probes redirected to `/web/login?redirect=%2Fodoo%3F`, so no
authenticated Matrix comparison is available. The existing DuckDB rollback
dependent-entry blocker remains open, and one unrelated pre-existing
`surveys_test_entry` fixture expectation remains red in the broader module run.
No parity or module sign-off is claimed; Surveys remains **qa-in-progress /
conditional**.

## 2026-09-21 — `SURVEYS-PUBLIC-DATE-QUESTION-001`

Selected the smallest uncovered source-backed public question behavior after
the completed begin, section, cookie-resume, scoring, completion-message,
live-session, deadline, and answer-validation slices: Odoo's question-level
date validation. Core3 adds deterministic optional Date question fixture
`question-certification-date`, renders it with the custom ISO text control,
and validates `YYYY-MM-DD` calendar dates in the token-scoped public
progress/submit path before durable mutation. API/page YAML remain separate
under `page.id: surveys`; both mutations remain guarded by `surveys.public`.

Focused verification passes 2/2 tests with 21 assertions, including invalid
date no-mutation, valid answer persistence, concurrent idempotent submit,
wrong-token rejection, and file-backed DuckDB restart. Fresh authenticated
Core3 desktop/mobile probes recorded login and `/api/auth/me` HTTP 200, public
API HTTP 404 `API route not found`, rendered route HTTP 200 with body
`Unauthorized`, and no horizontal overflow or failed browser requests. Odoo
8069 returned HTTP 200 only after redirecting to its login page at both
viewports; no installed authenticated Survey Date fixture was available.
Evidence is under the feature directory. Status remains **qa-in-progress /
conditional**; no module sign-off is claimed.

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

## 2026-09-21 — `SURVEYS-RESPONSIBLE-USER-001`

Selected the smallest open behavior after restricted-user access: Odoo's
authenticated `survey.survey.user_id` Responsible assignment, distinct from
the completed `restrict_user_ids` relation. Core3 now persists
`responsible_user_id`/`responsible_user_name`, projects both through the
existing catalog/detail API pair, and binds a `surveys.write` page action.
The mutation requires an actor, current row version, non-archived survey,
valid fields, and restricted-user membership when applicable; stale replay is
rejected and file-backed restart preserves the assignment.

Focused verification: **3 passed / 17 assertions**. Runtime evidence records
Core3 ports 3000/3001/3390/3391 and Odoo port 8072 unavailable, so no
authenticated desktop/mobile or paired Odoo sign-off is claimed. Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-RESPONSIBLE-USER-001/`.

## 2026-09-21 — `SURVEYS-ACTIVITY-001`

Selected the smallest open authenticated behavior after responsible-user
assignment: Odoo Survey activities from `mail.activity.mixin`. Core3 now
persists `survey_activities`, exposes separate API schedule/complete actions,
and binds them to the existing `survey-detail` page through the activity
source/action contract. Actor, `surveys.write`, active-survey, type/date/
summary, parent row-version, activity row-version, replay, and restart guards
are covered.

Focused verification: **3 passed / 18 assertions**. Runtime evidence records
Core3 ports 3000/3001/3390/3391 and Odoo port 8072 unavailable; no
authenticated desktop/mobile or paired Odoo sign-off is claimed. Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-ACTIVITY-001/`.

## 2026-09-21 — `SURVEYS-CHATTER-NOTE-001`

Selected the smallest open authenticated behavior after Survey activities:
Odoo's `mail.thread` chatter note on `survey.survey`. Core3 now persists
`survey_messages`, unions notes into the existing authenticated activity/
chatter datasource, and binds a separate `surveys.write` note action through
the existing page/API pair. Actor, permission, active/current row-version,
content, stale replay, migration replay, and restart guards are covered.

Focused verification: **3 passed / 12 assertions**; compatibility regression:
**6 passed / 30 assertions**. Runtime evidence records Core3 ports
3000/3001/3390/3391 and Odoo port 8072 unavailable, so no authenticated
desktop/mobile or paired Odoo sign-off is claimed. Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-CHATTER-NOTE-001/`.

## 2026-09-21 — `SURVEYS-FOLLOWERS-001`

Selected the next Odoo-backed `mail.thread` behavior after internal chatter
notes: follower subscription on the authenticated Survey form. Odoo's
`survey.survey` inherits `mail.thread` (`addons/survey/models/survey_survey.py:23`)
and the form includes `<chatter/>` (`survey_survey_views.xml:199`). Core3
adds migrations `0.0.60`/`0.0.61`, a deterministic follower fixture, and
separate `survey-detail` API/page bindings for listing candidates and adding
or removing followers. `surveys.write`, actor, active/current parent,
duplicate, missing, and relation-stale guards are enforced; durable rows and
candidate filtering survive restart. The Odoo source has no Survey
`company_id`, so no company predicate was invented for this slice.

Verification: **3 focused tests / 20 assertions** and **32 adjacent Surveys
tests / 270 assertions** pass. Audit: **753 pages, 762 routes, 1,519
datasources**. Scoped ESLint and diff-check pass. The broad Surveys run
reproduced the existing DuckDB migration dependency failure before it was
terminated; no full-repository regression was run. Core3/Odoo ports were
closed, blocking authenticated desktop/mobile and paired Odoo captures.

Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-FOLLOWERS-001/`.

## 2026-09-21 — `SURVEYS-INVITE-ATTACHMENT-001`

Selected the next smallest open source-backed invite behavior: Odoo's
`survey.invite.attachment_ids` many-to-many binary composer field and its
inclusion in outgoing invite mail. Core3 now has a separate authenticated
`survey-invite-detail` page/API pair, a durable `survey_invite_attachments`
ledger, shared upload/download storage, and a deterministic certification
guide fixture. The upload is permissioned by `surveys.write`, requires an
authenticated actor, rejects archived/missing invitations, stale row versions,
empty files, and duplicate names, and stores the actor and bytes durably.

Focused coverage is **3 passed / 32 assertions**; the adjacent invite/catalog
regression is **29 passed / 274 assertions**. File-backed DuckDB reopen and
download preserve the uploaded invitation document. Core3 desktop/mobile
capture was blocked because ports 3000, 3001, 3390, and 3391 refused
connections. Odoo `/odoo/surveys?` returned HTTP 303 to login and the
session-code probe returned HTTP 200 `{"error":"survey_wrong"}`; no
authenticated fixture or paired visual comparison is claimed.

Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-INVITE-ATTACHMENT-001/`.

## 2026-09-21 — `SURVEYS-RESTRICTED-USERS-001`

Selected the next smallest open source-backed backend behavior: Odoo's
`survey.survey.restrict_user_ids` access relation. Core3 now persists a
deterministic `survey_restricted_users` relation, filters the Surveys catalog,
detail, and relation datasource by `current_user_id`, and exposes add/remove
relation actions on the existing `survey-detail` page/API pair. Mutations
require `surveys.write`, an authenticated actor, a non-archived survey, and
matching parent/relation row versions; duplicate and stale replay are rejected
before mutation. The relation and server-side visibility survive restart.

Focused coverage is **3 passed / 26 assertions**; adjacent catalog/detail
regression is **34 passed / 310 assertions**. Audit reports **747 pages, 756
routes, and 1,490 datasources**; scoped ESLint and diff-check pass. Core3
desktop/mobile capture was blocked by refused ports 3000, 3001, 3390, and 3391.
Odoo `/odoo/surveys?` returned HTTP 303 to login and the session probe returned
HTTP 200 `{"error":"survey_wrong"}`. No authenticated visual or paired Odoo
sign-off is claimed.

Evidence:
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-RESTRICTED-USERS-001/`.

## 2026-09-21 — SURVEYS-CERTIFICATION-BADGE-001

Selected the smallest open certification behavior after the Wave 31 report:
Odoo awards a configured gamification badge when a certification succeeds.
Core3 adds a separate authenticated survey-certification-badge page/API pair,
passed-participant filtering, and a durable one-award ledger keyed by
participant. The surveys.manage mutation enforces passed state and actor
identity, then replays safely across concurrent calls and file-backed restart.
Participant detail exposes the badge surface only for passed attempts.

Focused verification passes 4 tests / 22 assertions; the adjacent badge,
report, and Surveys catalog regression passes 31 tests / 264 assertions.
Audit, scoped lint, and diff-check pass. Desktop/mobile and Odoo comparison
remain conditional because Core3 ports were unavailable and Odoo Surveys was
behind the login/session boundary. No sign-off is claimed.

Evidence is under
plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-CERTIFICATION-BADGE-001/.

## 2026-09-21 — `SURVEYS-CERTIFICATION-REPORT-001`

Selected the smallest remaining authenticated certification behavior after the
public live-poll slice. Odoo's `/survey/<survey_id>/get_certification` route
requires a succeeded certification attempt and renders the certification
report. Core3 adds the `survey-certification-report` page/API pair, a passed
participant-only datasource, and a `surveys.read` print action reached from
participant detail. Report runs persist under a deterministic participant and
actor key; actor mismatch and failed/in-progress attempts are rejected before
mutation. File-backed reopen and concurrent replay retain one report history
row.

Focused verification passes **4 tests / 22 assertions**. Browser and Odoo
comparison are conditional: Core3 service ports were unavailable and Odoo did
not expose an authenticated Surveys certification fixture. No sign-off is
claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-CERTIFICATION-REPORT-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-LIVE-POLL-001`

Selected the next uncovered source-backed live-session behavior after the
completed join, answer, results, leaderboard, timer, and navigation slices:
Odoo's attendee question update delivered by the host's `next_question` bus
event. Core3 adds an explicit token-scoped
`GET /api/public/surveys/session/<session_code>/poll` operation to the existing
`survey-live-session-join` page/API pair. It returns the current question,
attendee answer, and durable session `row_version` as `poll_revision`; missing
or foreign attendee tokens are rejected without disclosure.

The public renderer polls every three seconds while an attendee is waiting or
has already answered, while leaving an unanswered form intact during typing.
Focused verification is **2 passed / 20 assertions**; adjacent live-session
join/answer/results regression is **10 passed / 93 assertions**. Restart and
concurrent-poll revision convergence are green. Audit, scoped ESLint, and
`git diff --check` pass. Core3 ports 3000, 3001, 3390, and 3391 refused
connections. Odoo `/odoo/surveys?` returned 303 to login and
`/survey/check_session_code/5822` returned `{"error":"survey_wrong"}`; no
authenticated desktop/mobile comparison or parity sign-off is claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-LIVE-POLL-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-LANGUAGE-001`

Selected the next uncovered source-backed public participant behavior after
Wave 28: Odoo's survey language selection. Core3 migration `0.0.49` persists
supported survey language codes and each response's immutable
`language_code`. The page/API pair remains separate (`page.id: surveys`);
public start defaults to the first configured language, rejects unsupported
codes before inserting or mutating a response, and prevents changing a
language after a response has begun. The admin detail/response contract is
`surveys.read`, while token-bound start/read remains `surveys.public`.

Focused verification is **2 passed / 25 assertions**. Adjacent public
response/random-selection/skipped-question regression is **9 passed / 107
assertions**. Restart and concurrent idempotent start coverage is green.
Audit, scoped ESLint, and `git diff --check` pass. Core3 ports 3000, 3001,
3390, and 3391 refused connections. Odoo `/odoo/surveys?` returned 303 to the
login route and `/survey/check_session_code/5822` returned
`{"error":"survey_wrong"}`; no authenticated desktop/mobile Odoo comparison
or parity sign-off is claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-LANGUAGE-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-RANDOM-SELECTION-001`

Wave 27 selected Odoo's next uncovered public survey setting:
`questions_selection=random`. Core3 migration `0.0.47` adds durable survey
selection metadata and a per-response `question_order`; start, begin, retry,
next, previous, and the renderer consume the same persisted order. The paired
page/API contracts expose the setting and keep public mutations under
`surveys.public`, while authenticated detail inspection remains under
`surveys.read`.

Focused verification is **2 passed / 26 assertions**; adjacent progression and
next/previous regressions are **9 passed / 62 assertions**. Coverage includes
foreign-token rejection, restart persistence, and concurrent navigation replay.
Core3 authenticated desktop/mobile capture was blocked because ports
3000/3001/3390/3391 were not listening. Odoo desktop/mobile both returned
303 to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; proxy 8072 refused, so no
authenticated reference comparison or sign-off is claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-RANDOM-SELECTION-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-SKIPPED-QUESTION-001`

Wave 28 selected Odoo's durable optional-question skip behavior. Odoo stores
`survey.user_input.line.skipped` and creates a skipped line when an empty
answer is submitted (`survey_user_input.py:354-363,700-708`). Core3 migration
`0.0.48` adds `survey_responses.skipped_questions` and a deterministic public
fixture with required/optional/required questions. The paired `page.id:
surveys` API contract projects the state; token-scoped progress/submit rejects
required or foreign skipped IDs before mutation and preserves the set across
restart and idempotent submit. The renderer sends and restores the set.

Focused verification is **2 passed / 21 assertions**; adjacent public
regression is **13 passed / 126 assertions**. Core3 desktop/mobile capture was
blocked because ports 3000/3001/3390/3391 were unavailable. Odoo redirected
both viewport probes to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; proxy 8072
refused. No authenticated reference comparison or parity sign-off is claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-SKIPPED-QUESTION-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-BACK-GUARD-001`

Selected the next uncovered Odoo public setting after per-respondent attempt
limits: `users_can_go_back`. Odoo stores the setting on the survey and exposes
`can_go_back` only when the response/layout/cursor permit it. Core3 migration
`0.0.43` persists the setting, seeds a deterministic published two-question
no-back survey, exposes it through separate page/API YAML, hides the public
Back control when disabled, and guards direct Previous mutations with
`SURVEY_PUBLIC_PREVIOUS_DISABLED`.

Focused coverage is **6 passed / 41 assertions**; the public/catalog regression
is **91 passed / 857 assertions** across 30 files. The full Surveys glob is
**131 passed / 4 failed / 1,139 assertions** across 135 tests; the four known
failures are the existing DuckDB migration rollback/dependent-entry errors.
Audit is **726 pages, 735 routes, 1,409 datasources**; scoped lint and diff-check pass. File-backed
restart preserves the disabled setting; enabling it allows concurrent Previous
requests to converge on one navigation key. Core3 ports 3000/3001/3002
refused, Odoo 8069 redirected to login, and proxy 8072 refused. No visual or
Odoo parity sign-off is claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-BACK-GUARD-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-ONE-PAGE-001`

- Selected exactly one new source-backed behavior after token-only access:
  Odoo's public `questions_layout=one_page` pagination.
- Added durable migration `0.0.45` and deterministic two-question fixture;
  detail/list projections and the public renderer consume the layout through
  the paired `page.id: surveys` YAML contracts.
- Implemented all-question public submit with required-answer validation,
  existing token/state guards, progress persistence, restart recovery, and
  concurrent idempotent convergence to one response/count.
- Focused: **3 passed / 21 assertions**. Public/catalog regression: **97
  passed / 903 assertions**. Audit: **729 pages, 738 routes, 1,419
  datasources**. Scoped ESLint and diff-check passed.
- Core3 3000/3001/3002 refused connections; Odoo 8069 redirected desktop and
  mobile probes to login and 8072 refused. Exact blockers are in the feature
  evidence; no visual or Odoo sign-off is claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-ONE-PAGE-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-PROGRESSION-MODE-001`

- Selected exactly one new source-backed behavior after one-page pagination:
  Odoo's public `progression_mode` (`percent` / `number`) setting.
- Added durable migration `0.0.46` and deterministic numbered fixture;
  detail/list projections and the renderer consume the setting through the
  paired `page.id: surveys` YAML contracts.
- Implemented percentage and answered-count progress labels without changing
  one-page behavior; existing token/state/required/time/idempotency guards
  remain authoritative.
- Focused: **3 passed / 18 assertions**. Public/catalog regression: **100
  passed / 921 assertions**. Audit: **731 pages, 740 routes, 1,424
  datasources**. Scoped ESLint and diff-check passed.
- Core3 3000/3001/3002 refused connections; Odoo 8069 redirected desktop and
  mobile probes to login and 8072 refused. Exact blockers are in the feature
  evidence; no visual or Odoo sign-off is claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-PROGRESSION-MODE-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-TOKEN-ACCESS-001`

Wave 24 selects the next uncovered source-backed public access behavior after
back-navigation: Odoo's `access_mode='token'` guard. Core3 previously exposed
the setting but allowed a published token-only survey to create an anonymous
response from only the survey token. Migration `0.0.44` adds a deterministic
invitation-only survey and pre-created `New` answer token. The separate
`survey.public.access` operation scopes the answer token to the survey token;
the public route rejects missing/wrong tokens before question disclosure or
the New → In Progress transition. The paired `pages/surveys.yaml` /
`api/surveys.yaml` contract retains `page.id: surveys`, `surveys.public`, and
the YAML start guard.

Focused verification is **3 passed / 25 assertions**; the public/catalog
regression is **94 passed / 882 assertions across 31 files**. Scoped ESLint,
audit (**727 pages, 736 routes, 1,413 datasources**), and diff-check pass.
The file-backed DuckDB test proves concurrent start convergence and resumed
answer-token state. Browser screenshots were captured at 1440x1000 and
390x844, but the bounded runtime returned 401 Unauthorized for the public API
before rendering data. Odoo 8069 redirected the synthetic route to `/` and
the 8072 proxy refused; no authenticated paired reference fixture exists.
Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-TOKEN-ACCESS-001/`.
Status remains **qa-in-progress / conditional**; no module sign-off is
claimed.

## 2026-09-21 — `SURVEYS-PUBLIC-ATTEMPT-LIMIT-001`

Selected the next uncovered Odoo-backed participant behavior: per-respondent
attempt limits. Odoo stores `access_mode`, `users_login_required`,
`is_attempts_limited`, and `attempts_limit`, counts submitted non-test attempts
by respondent identity, and rejects exhausted starts/submits. Core3 now stores
the same metadata durably, exposes it through separate page/API YAML contracts,
requires a normalized email for the limited public fixture, and guards start,
submit, and retry with `surveys.public` and attempt-exhaustion boundaries.

Focused coverage is **3 passed / 30 assertions**; related public retry coverage
is **6 passed / 54 assertions**. The full Surveys glob is **128 passed / 4
failed / 1,116 assertions** across 132 tests; the four failures are the
existing DuckDB migration rollback/dependent-entry failures. Audit passes with
**725 pages, 734 routes, and 1,407 datasources**; scoped lint and
`git diff --check` pass. File-backed restart and concurrent idempotent starts
converge on one durable response. Core3 ports 3000/3001/3002 refused
connections, while Odoo 8069 redirected to `/web/login` and proxy 8072 refused;
no authenticated visual or installed-reference sign-off is claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-ATTEMPT-LIMIT-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-ATTEMPT-LIMIT-001`

Selected the next uncovered source-backed public behavior: Odoo's
per-respondent attempt limit. Core3 migration `0.0.42` persists access mode,
login-required state, limit enablement, and attempt count, with a deterministic
published one-attempt fixture. The paired API/page contract exposes the
metadata; public start collects normalized respondent email, and start/retry/
submit reject exhausted completed non-test attempts while unrestricted public
surveys remain anonymous.

Focused coverage is **3 passed / 30 assertions**; the related attempt/retry
suite is **6 passed / 54 assertions**. Full Surveys verification is **128
passed / 4 failed / 1,116 assertions** across 132 tests; the four failures are
the existing DuckDB migration rollback/dependent-entry blocker. Audit is **725
pages, 734 routes, 1,407 datasources**. Core3 desktop/mobile probes were
blocked by connection refusal on 3000/3001/3002. Odoo redirected to its login
shell and 8072 was unavailable; no authenticated reference comparison or
sign-off is claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-ATTEMPT-LIMIT-001/`.

## 2026-09-21 — `SURVEYS-QUESTION-DUPLICATE-001`

Selected the next uncovered source-backed question behavior: Odoo's
`survey.question.copy()` action. Core3's question detail now has a separate
page action and API mutation joined by `survey-question-detail`; the mutation
copies the question and suggested values, increments the parent survey version,
and enforces `surveys.write`, source, archived, stale, and duplicate-id guards.

Focused verification is **3 passed / 21 assertions**, including file-backed
restart and replay. The current bounded Surveys glob is **125 passed / 4
failed / 1,086 assertions** across 129 tests; the four failures are the
documented migration rollback dependent-entry failures, and no unrelated files
were repaired. Audit is **723
pages, 732 routes, 1,402 datasources**. Core3 desktop/mobile probes were
blocked by connection refusal on 3000/3001/3002. Odoo redirected to its login
shell and 8072 was unavailable; no authenticated reference comparison or
sign-off is claimed.

Evidence: `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-QUESTION-DUPLICATE-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-SURVEY-TIMER-001`

Selected the smallest uncovered source-backed behavior after the completed
public question-type and live-question timer slices: Odoo's survey-level
elapsed time limit. Core3 now persists survey `is_time_limited`/`time_limit`
and response `start_datetime`, keeps the authenticated `surveys` page and
public API fragments separate through `page.id: surveys`, renders a public
countdown, and rejects expired token-scoped reads/navigation/progress/submit
with `SURVEY_PUBLIC_TIME_LIMIT_EXPIRED` before mutation. The response deadline
and live-session question timer remain independent.

Focused verification is **9 passed / 99 assertions**. The full Surveys glob is
**122 passed / 4 failed / 1,065 assertions**; all failures are the existing
DuckDB migration rollback/dependent-entry limitation in
`surveys_migrations.integration.test.ts`. The UI audit passes with **722
pages, 731 routes, and 1,400 datasources**; scoped ESLint and diff-check pass.
Core3 desktop/mobile browser probes were blocked by connection refusal on ports
3000/3001/3002. Odoo 8069 redirected to login and its Surveys addon is
uninstalled; proxy 8072 was unavailable. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-SURVEY-TIMER-001/`.
Status remains **qa-in-progress / conditional**; no module sign-off is claimed.

## 2026-09-21 — `SURVEYS-LIVE-QUESTION-TIMER-001`

Wave 19 selected the next uncovered source-backed live-session behavior: the
Odoo per-question timer. Migration `0.0.40` persists question timer metadata
and an isolated deterministic session; the paired page/API returns the timer
state, the attendee renderer displays and expires the countdown, and the
server-side mutation rejects late answers before answer/counter mutation.

Focused timer plus related live-answer checks pass **4/4 with 45 assertions**;
the full Surveys glob is **120 passed / 4 failed / 1041 assertions**. The four
failures are the pre-existing DuckDB rollback/dependent-entry errors in the
migration suite. Audit is **721 pages, 730 routes, 1396 datasources**; scoped
lint and diff-check pass. Core3 port 3000 refused both authenticated desktop
and mobile probes. Odoo 8069 returned the login shell for both viewports and
8072 refused; no visual comparison or sign-off is claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-LIVE-QUESTION-TIMER-001/`.

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

## 2026-09-21 — `SURVEYS-PUBLIC-NUMERICAL-QUESTION-001`

Selected the next uncovered source-backed question behavior after the completed
image, background, identity/comment, conditional, navigation, and excluded
question-type slices: Odoo numerical-box range validation. Migration `0.0.36`
adds durable validation-required/min/max/message fields and a separate
published numerical fixture. The existing paired `page.id: surveys` contract
projects the fields, and public progress/submit reject malformed or out-of-range
values before mutation. The renderer presents the inclusive range as a number
input and preserves the source validation message.

Focused coverage passes 2/2 with 26 assertions and the public/core Surveys
regression passes 77/77 with 708 assertions, including invalid no-mutation,
valid decimal persistence, file-backed restart, concurrent idempotent submit,
response count, and wrong-token denial. Core3 authenticated admin/public
desktop/mobile evidence passes at 1440x900 and 390x844 with no browser errors or
overflow. Audit passes with 718 pages, 727 routes, and 1375 datasources. Odoo
redirects both viewports to login and proxy 8072 is unavailable; no paired Odoo
fixture or module sign-off is claimed. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-NUMERICAL-QUESTION-001/`.

## 2026-09-21 public Char question additions

Feature ID: `SURVEYS-PUBLIC-CHAR-QUESTION-001`.

Odoo `survey.question._validate_char_box` email and inclusive length rules are
implemented as durable `validation_email`, `validation_length_min`, and
`validation_length_max` metadata on a separate published Char fixture. The
paired `page.id: surveys` page/API contract exposes those fields; public
progress/submit preserve `surveys.public` and reject invalid answers before
mutation. Valid email persistence, restart, concurrent idempotent submit, count
integrity, and wrong-token denial are covered.

Focused coverage is **2 passed / 26 assertions** and the public/core Surveys
regression is **79 passed / 733 assertions**. Authenticated Core3 desktop/mobile
admin and public probes pass with no browser failures or overflow. Odoo remains
conditional: both viewports redirect to the login shell and port 8072 refuses
connections. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-CHAR-QUESTION-001/`.

## 2026-09-21 public Text question additions

Feature ID: `SURVEYS-PUBLIC-TEXT-QUESTION-001`.

Odoo `text_box` multi-line response semantics are implemented as a durable
published Core3 `Text` fixture. The paired page/API contract remains separate;
the renderer uses a three-row textarea, public progress/submit retain
`surveys.public`, arrays are rejected before mutation, and required newline
text persists across file-backed restart and idempotent concurrent submit.

Focused coverage is **2 passed / 23 assertions** and the public/core Surveys
regression is **81 passed / 756 assertions**. Audit is **718 pages, 727 routes,
1382 datasources**; scoped ESLint and diff-check pass. Authenticated page API
binding returns 200, but the isolated browser topology reports `Service host
unavailable` before visual rendering and anonymous public API access returns
401. Odoo remains conditional because both viewports redirect to login and port
8072 refuses connections. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-TEXT-QUESTION-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-MULTIPLE-CHOICE-001`

Selected the next uncovered source-backed public question behavior: Odoo
`multiple_choice` multi-select answers. Migration `0.0.39` adds a deterministic
published Product Preferences Survey and required checkbox question. The
existing paired page/API contract remains separate and public progress/submit
retain `surveys.public`; foreign and duplicate options are rejected before
mutation, valid selections persist through file-backed restart, and concurrent
submit replays one durable response/count.

Focused coverage passes **2/2 with 24 assertions**; the public/core Surveys
regression passes **83/83 with 780 assertions**. Audit passes with **719 pages,
728 routes, and 1391 datasources**; scoped lint and diff-check pass. Browser evidence records
Core3 desktop/mobile connection refusal before render and Odoo login redirects
plus unavailable proxy 8072; no visual or paired Odoo sign-off is claimed.
Surveys remains **qa-in-progress / conditional**.
