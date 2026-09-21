# Surveys UI parity gate

Status: in-progress

This is the implementation gate for the Odoo 19 Community `survey` addon. The
installed disposable reference now authorizes a YAML-first vertical slice; the
module remains `in-progress` until the acceptance gates below are verified.

## Reference and exact live limitation

- Odoo source: `/home/nhanjs/projects/odoo`, revision `65975996` (`19.0`).
- Manifest: `addons/survey/__manifest__.py`; identity `Surveys`, version `3.7`,
  category `Marketing/Surveys`, license `LGPL-3`, installable/application,
  sequence `220`.
- Dependencies are `auth_signup`, `http_routing`, `mail`, `web_tour`, and
  `gamification`. Backend assets include the survey list/kanban/question
  renderers and SCSS; frontend assets include the public survey form and live
  session assets. These are behavior/style references, not code to copy.
- Official non-demo data includes survey reports/templates, server actions,
  mail subtypes/templates, security/access rules, menus, survey/question/user
  views, public/session templates, the invite wizard, badge views, and the
  partner certification extension.
- Official demo data is present: `gamification_badge_demo.xml`,
  `res_users_demo.xml`, `survey_demo_feedback.xml` plus its user-input and
  line files, `survey_demo_certification.xml` plus its user-input and line
  files, and `survey_demo_conditional.xml`. Preserve the semantic examples
  Feedback Form, MyCompany Vendor Certification, and Burger Quiz, including
  sections, scored answers, conditional questions, matrix answers, and
  completed/failed attempts. Convert relative dates to a fixed Core3 seed date.

The authenticated live audit was performed on `2026-09-10` against
`http://localhost:8069` as the admin user from the parent parity plan. The
authenticated `ir.module.module.search_read` result for `name=survey` was:
`state=uninstalled`, `demo=false`, `latest_version=false`,
`installed_version=19.0.3.7`. Consequently the primary live database has no
truthful Surveys app menu, action, record, installed view, demo record, public
survey token, or Surveys action route to capture.

The reference gate was subsequently satisfied in the disposable database
`core3_surveys_demo`, with `survey|installed|true`, four demo surveys, and
eight participant attempts. Credentials are `admin` / `SurveysDemo2026!` and
the isolated HTTP worker is available through the local disposable-reference
proxy on port 8072. Authenticated desktop/mobile captures are under `/tmp`:
`/tmp/odoo-surveys-{surveys,participants,questions,suggested-values,detailed-answers}-{desktop,mobile}.png`.
The observed action routes are `/odoo/surveys`, `/odoo/action-178`
(Participants), `/odoo/action-180` (Questions), `/odoo/action-181` (Suggested
Values), and `/odoo/action-179` (Detailed Answers); each loaded seeded data
with no unexpected failed responses or mobile overflow.

Truthful fallback captures (authenticated Discuss, not Surveys reference
screens) are under `/tmp` and must never be committed:

| Surface | Viewport | Evidence |
| --- | --- | --- |
| Authenticated Discuss fallback; Surveys absent | 1440x900 | `/tmp/odoo-surveys-uninstalled-desktop.png` |
| Authenticated Discuss fallback; Surveys absent | 390x844, touch/mobile emulation | `/tmp/odoo-surveys-uninstalled-mobile.png` |

Both fallback captures navigated to `/odoo/discuss` after login and recorded
zero failed network requests; they are retained only as historical evidence.

## Six register gates and evidence state

1. **Manifest/version/demo:** passed for source and the installed disposable
   runtime, including `demo=true`.
2. **Visible menus, actions, views, and states:** passed for the five captured
   menu/action surfaces and their seeded records.
3. **Desktop/mobile routes and screenshots:** passed for 1440x900 and 390x844;
   installed reference captures are under `/tmp/odoo-surveys-*`.
4. **Deterministic Core3 datasource/API fixtures:** in progress; the first
   service-owned catalog batch is implemented in the dedicated worktree.
5. **Shared primitives:** passed for the current slice using ListView,
   OdooFormView, Chart, StatRow, and shared server forms; no new primitive is
   introduced.
6. **Acceptance:** in progress; broader workflow, permission, empty/error,
   public-flow, and visual checks remain.

## Current implementation batch

Core3 now exposes `/surveys`, `/surveys/participants`, `/surveys/questions`,
`/surveys/suggested-values`, `/surveys/detailed-answers`,
`/surveys/analysis`, and `/surveys/detail`. The first batch extracts the
survey, analysis, and detail queries into convention-discovered API fragments;
adds participant, question, suggested-value, and detailed-answer catalogs;
normalizes the deterministic fixture set to the four installed Odoo demo
surveys; and adds shared ListView/server-form contracts plus survey-row detail
navigation. Authenticated Core3 checks at 1440x900 and 390x844 loaded every
route with seeded data, no unexpected failed responses, and no horizontal
overflow. A mobile survey detail check rendered the certification questions,
and the Questions New action opened the shared form with nine fields. Captures
are under `/tmp/core3-surveys-{surveys,participants,questions,suggested-values,detailed-answers,analysis}-{desktop,mobile}.png`,
with additional detail/form captures under `/tmp/core3-surveys-*`. The batch
was developed in `agent/odoo-ui-surveys-impl2` and integrated as `453f787a`,
`7803bcc1`, `fbe848e8`, `43b762b6`, `c2a3a012`, `952394b4`, `18e0f702`, and
`5863a7f7`.

The detail-form follow-up adds explicit state-gated Publish, Close, and Cancel
controls to the shared OdooFormView. An authenticated mobile check rendered a
Draft survey, clicked Publish, observed the Published state, then opened a
Published certification survey with Close available; its detail questions and
response section rendered without failed requests or horizontal overflow.
The transition capture is `/tmp/core3-surveys-detail-draft-published-mobile.png`.

The fixture fidelity follow-up expands the Odoo-derived question catalogs to
the observed card/detail sizes: 14 certification questions, 7 feedback
questions, 13 burger questions, and 4 conditional questions. Fresh desktop and
mobile checks confirmed the certification detail renders all 14 question rows,
the list remains at 4 surveys, and no unexpected requests or horizontal
overflow occur. Captures are
`/tmp/core3-surveys-detail-certification-{desktop,mobile}.png`.

The question-form follow-up adds `/surveys/question-detail` with a service-owned
question datasource, shared OdooFormView editing, suggested-answer rows, and
row double-click navigation from the Questions list. Authenticated desktop and
mobile checks loaded the 38-question catalog, opened the certification question,
rendered its `Desk,Laptop,Screen` values, and confirmed Edit with no unexpected
failed responses or horizontal overflow. Captures are under
`/tmp/core3-surveys-question-detail-{desktop,mobile}.png`.

The Suggested Values follow-up adds a permissioned New form with a question
lookup, answer value, sequence, score, and matrix row/column fields. Authenticated
desktop/mobile checks opened the form, created `QA Excellent` and `QA Mobile`,
and confirmed list refresh from 5 to 6 and then 7 rows with zero failed requests
or horizontal overflow. Core3 captures are
`/tmp/core3-surveys-{desktop,mobile}-suggested-values-{list,new}.png`; the
installed Odoo action 181 reference captures are
`/tmp/odoo-surveys-suggested-values-{desktop,mobile}.png`.

The participant-detail follow-up adds `/surveys/participant-detail`, list-row
navigation, a statusbar-backed read-only participant form, and service-owned
submitted answer lines. Authenticated desktop/mobile checks opened the
certification participant from the list, rendered its two answer lines, and
returned no failed requests or horizontal overflow. Captures are
`/tmp/core3-surveys-{desktop,mobile}-participant-detail.png`.

The Detailed Answers follow-up adds `/surveys/detailed-answer-detail`, row
navigation, and a readonly answer-line form grouped into Answer and Submission
sections. Authenticated desktop/mobile checks opened the certification policy
answer, rendered its survey, answer state, score, participant, and submission
timestamp, and returned no failed requests or horizontal overflow. Captures are
`/tmp/core3-surveys-{desktop,mobile}-detailed-answer-detail.png`.

The lifecycle follow-up adds an explicit Archived state plus guarded Archive and
Reopen actions on the survey list and detail form. Direct authenticated action
checks returned 200 for both transitions and restored the deterministic survey
to Draft; the detail statusbar exposes Draft, Published, Closed, Cancelled, and
Archived. Workflow captures are retained at
`/tmp/core3-surveys-detail-archived-desktop.png` and
`/tmp/core3-surveys-detail-reopened-desktop.png`.

The survey-detail stats batch adds Odoo-style Certified and Participants stat
buttons to the shared form. A service-owned migration completes the
certification fixture to 4 participants and 2 certified results, matching the
installed Odoo reference. Authenticated desktop/mobile checks rendered
`MyCompany Vendor Certification`, both counters, and stat navigation to
`/surveys/participants?survey_id=survey-demo-certification` with no failed
requests or horizontal overflow. Captures are
`/tmp/core3-surveys-{desktop,mobile}-detail-stats.png`.

The public-flow follow-up adds a token-scoped `/survey/start/<survey_token>`
and `/survey/<survey_token>` browser surface for published surveys. It mirrors
Odoo's public start screen, responsive question progression, required-answer
validation, UUID answer token, and submitted response lifecycle through
`/api/public/surveys/<survey_token>[/start|/submit]`. The Odoo feedback token
`b135640d-14d4-4748-9ef6-344ca256531e` is seeded for comparison. Desktop and
mobile captures are `/tmp/core3-public-survey-start-{desktop,mobile}.png`,
`/tmp/core3-public-survey-question-{desktop,mobile}.png`, and
`/tmp/core3-public-survey-done-{desktop,mobile}.png`; the matching Odoo
reference start captures are `/tmp/odoo-public-survey-start-{desktop,mobile}.png`.
This is a bounded first public slice: Odoo's print, image, session-manager,
multi-page/section, authenticated test/results, and exact question semantics
remain open acceptance gates.

The public-flow resume follow-up closes the next evidenced acceptance gap:
Core3 now persists answers after each page, accepts the Odoo-shaped
`/survey/<survey_token>/<answer_token>` route, resumes an in-progress attempt
after reload, and exposes Back/Next navigation. The token is still scoped to
the published survey and progress writes are guarded by the service-owned
`surveys.public.progress` mutation. Odoo-style cookies, page/section routing,
print, image assets, live sessions, and exact question-type semantics remain
outside this bounded slice.

The authenticated results follow-up adds a permissioned `/surveys/results`
route, a `See results` action from the survey detail form, service-owned
header/question/choice/text result queries, response counters, answer chart,
question response-rate table, and text-response table. The lists use the
shared Odoo-style table with body scrolling so their responsive overflow stays
inside the viewport. Authenticated desktop/mobile checks for the seeded
Feedback Form reached the route through the detail action and returned no
failed requests or document overflow. Captures are
`/tmp/core3-survey-results-{desktop,mobile}.png`; the matching Odoo reference
captures are `/tmp/odoo-survey-results-{desktop,mobile}.png`. The results
screen remains a bounded first slice: Odoo's per-question response sections,
print action, live-session results, and exact answer-type renderers remain open
acceptance gates.

The participant workflow and answer-state follow-up adds server-side
`survey_id` and Quiz Passed filtering to `/surveys/participants`,
`participant_id` scoping to `/surveys/detailed-answers`, and deterministic New,
In Progress, skipped-answer, answered-answer, and no-answer fixtures in
migration `0.0.6`. The participant form remains readonly for answers and adds a
permissioned `Mark completed` action guarded by In Progress state, an answered
line, and the expected row version; stale or invalid completion returns 409.
Authenticated admin checks covered the survey stat route
`/surveys/participants?survey_id=survey-demo-certification` (4 rows), the
Quiz Passed=Passed filter (2 rows), answer scoping
`/surveys/detailed-answers?participant_id=participant-feedback` (3 rows),
answered/skipped/empty participant details, completion, and a no-match empty
state. Dispatcher authentication was also checked against the participant page
and datasource boundary: both returned 403 for missing `surveys.read`.
Desktop and mobile checks used 1440x900 and 390x844; the mobile empty state is
responsive and has no document overflow after a Surveys-owned CSS exception.
Captures are under `/tmp/core3-surveys-followup-*.png`, including
`participants-scoped-{desktop,mobile}.png`,
`participants-empty-fixed-mobile.png`,
`participant-{answered,skipped,empty-answers,completed}-{desktop,mobile}.png`,
`participants-denied-mobile-authenticated.png`, and
`detailed-answers-scoped-desktop.png`. Focused integration coverage is in
`test/surveys.integration.test.ts`; the full Surveys parity and permission,
public-flow, and Odoo visual acceptance gates remain in progress.

The landing-screen visual follow-up aligns the main Surveys action with the
installed Odoo reference: Odoo presents survey records as cards on both
desktop and mobile, while the prior Core3 table clipped Owner and later
columns at 390x844. The page now defaults to a CardView with title, owner,
completion, publication, and status fields; the desktop List mode remains
available as an explicit secondary view. Fresh authenticated checks show four
cards at each viewport, document width equal to the viewport, and no failed
responses. Evidence is `/tmp/core3-surveys-desktop-cards-fix.png` and
`/tmp/core3-surveys-mobile-cards-fix.png`; the installed Odoo comparison is
`/tmp/odoo-surveys-{desktop,mobile}-fresh.png`.

The participant invitation/print follow-up adds deterministic invitation state
(`Not sent`/`Sent`, count, and timestamp) to the participant contract. New
participants expose a permissioned Send invitation action; in-progress
participants expose Resend invitation; both validate state, email presence,
row version, and write permission server-side and return visible success/error
states. The same actions are present on the participant form. Completed
participants with answer lines expose Print completed answers, which first
passes the permissioned `surveys.participants.print_completed_answers` contract
and then opens `/surveys/participant-print`; the print surface is readonly,
answer-line based, and has a browser Print action. Direct print access remains
safe for incomplete/no-answer records through an unavailable/empty state, and
missing `surveys.read` is denied by the page/API boundary. No live-session work
is included in this batch.

The results-cohort follow-up adds Odoo-style All/Completed and Passed/Failed
filters to `/surveys/results`. The `StatusTabs` declarations fan each
selection through the page-id-bound `api/survey-results.yaml` sources so the
header counters, answer chart, question response rates, and text responses
remain in the same cohort. Migration `0.0.7` adds deterministic completed
passed/failed Feedback attempts and answer lines. Authenticated Core3 checks
at 1440x900 and 390x844 selected Completed (3 participants) and Passed (1
participant), confirmed the filtered text response, verified the New cohort
empty state, returned no failed API responses or horizontal overflow, and
confirmed an unauthenticated results page returns 401. Captures are
`/tmp/core3-survey-results-cohorts-{desktop,mobile}.png` and
`/tmp/core3-survey-results-cohorts-empty-{desktop,mobile}.png`.

The matching fresh Odoo reference check used database `core3_reference`,
`codex@core3.local`, route `/survey/results/feedback-form-1`, and 1440x900 /
390x844; both loaded Feedback Form without failed responses or horizontal
overflow. Captures are
`/tmp/odoo-survey-results-followup-{desktop,mobile}.png`.

The live-session follow-up implements the next uncovered visible Odoo action
state from the installed `core3_owned` reference. Odoo's Feedback Form exposes
`Create Live Session`; starting it opens `/survey/session/manage/<access_token>`
with the survey description, session code `5822`, join link, `0 Waiting for
attendees`, and `Start`. Core3 now owns a deterministic
`survey_live_sessions` record per seeded survey, adds permissioned
`Create Live Session`, `Open Session Manager`, and `Close Live Session`
controls to `/surveys/detail`, and exposes `/surveys/live-session` through the
matching `survey-live-session` page/API fragments. The lifecycle is guarded by
`surveys.manage`, optimistic session row versions, and the states `Closed`,
`Ready`, and `In Progress`; the bounded slice intentionally does not implement
question-by-question polling, attendee answers, leaderboard updates, or the
public `/s/<session_code>` join flow. Deterministic seed date is
`2026-01-15`; the migration is `0.0.9`.

Authenticated Odoo reference captures for this slice are
`/tmp/odoo-surveys-live-form-{desktop,mobile}.png` and
`/tmp/odoo-surveys-live-session-{desktop,mobile}.png`; Core3 comparison
captures are under `/tmp/core3-surveys-live-session-{desktop,mobile}.png`.
The Odoo session was closed after capture so `core3_owned` remains in its
initial no-active-session state.

The live-session manager follow-up covers the next visible Odoo action after
session creation: its `Start` control moves a `Ready` session to `In Progress`
and selects the first question by deterministic sequence. Core3 adds the
permissioned `start_live_session_question` action to the page/API pair already
bound by `page.id`, exposes the ordered session-question catalog, and records
explicit transport, empty, no-question, invalid-state, and optimistic
row-version conflict contracts. The existing seeded session fixtures remain
stable: Feedback Form starts with `How satisfied are you?`, while the
session-question catalog has a deterministic empty state for an unconfigured
survey. This slice intentionally does not implement next/back polling,
attendee answer aggregation, leaderboard updates, or the public `/s/<code>`
join flow.

Focused YAML and DuckDB integration coverage is in
`test/surveys.integration.test.ts`. Browser capture was not produced in this
turn because the required persistent Playwright `js_repl` capability is not
available in the current agent session; no screenshot is committed.

The authenticated Test action follow-up implements Odoo's `action_test_survey`
(``/survey/test/<access_token>``). Core3 adds the page/API pair
`survey-test`, a permissioned deterministic test-entry action, and fixed test
responses for the four seeded surveys. The test preview shows the survey
metadata and question catalog before the action hands off to the existing
token-scoped public form; test entries are labeled `This is a Test Survey
Entry.` and can return to the authenticated survey form. The action rejects
archived/empty/unseeded surveys server-side and requires `surveys.write`.
The deterministic seed date is `2026-01-15`; focused YAML/integration and
authenticated desktop/mobile browser evidence is retained under `/tmp`.

The public print follow-up implements Odoo's read-only
`/survey/print/<survey_token>` contract. Core3 adds a token-scoped print API
with optional answer-token review, deterministic completed Feedback Form
answers, selected-choice/numeric/text rendering, Take Again and browser Print
controls, and a no-question empty state. Invalid answer tokens return 422,
wrong-survey or unavailable tokens return 404, and non-GET print requests
return 405. Authenticated Odoo reference captures are
`/tmp/odoo-surveys-print-{desktop,mobile}-1440-or-390.png`; Core3 paired
captures and request/overflow telemetry are retained under `/tmp` after the
runtime verification. The survey-level print route is public by design, while
the existing authenticated participant-print/report contracts remain separate.

The live-session next-question follow-up implements the next installed Odoo
host action after the existing `Start`/first-question slice. The authenticated
Odoo manager route `/survey/session/manage/b135640d-14d4-4748-9ef6-344ca256531e`
showed `Next` advancing from `Where do you live?` to `When is your date of
birth?`, with `End of Survey` at the final question; no `Back` control was
visible in the installed state. Core3 therefore adds only the permissioned
`Next` action to the existing `survey-live-session` page/API pair. It advances
the deterministic ordered question, refreshes the current-question catalog,
hides the action at the final question, and guards closed/not-in-progress,
stale-row, and exhausted-question states with explicit 409 responses. The
slice does not add a public session join, attendee answers, leaderboard,
results, or an inferred Back action. Focused coverage is in
`test/surveys.integration.test.ts`; Odoo evidence is under
`/tmp/odoo-owned-surveys-live-{manager,question,next-back}-{desktop,mobile}.png`
where captured, and Core3 comparison evidence is retained under `/tmp` after
runtime verification.

The Share/invite follow-up implements the next Surveys-owned visible action
verified in the live personal Odoo database `core3_personal` as user
`codex@core3.local`: each survey card exposes `Share`, and the survey form
opens the `Share a Survey` composer. The initial Odoo modal shows `Survey Link`,
`Send by Email`, and `Close`; enabling email reveals `Recipients`,
`Additional emails`, `Subject`, the invitation message, `Attachments`,
`Answer deadline`, `Mail Template`, `Send`, and `Close`. Core3 now exposes the
same `Share` label from `/surveys` and `/surveys/detail?id=<survey_id>` through
the page/API pairs `surveys` and `survey-detail`. Both actions use the
`surveys.invites.send` server-form contract and exact field labels above, with
deterministic `Link ready` and `Sent` invite records from migration `0.0.12`.

The mutation requires `surveys.write`, rejects archived or stale survey rows
with `SURVEY_INVITE_SURVEY_CHANGED` (409), rejects a missing survey access
token with `SURVEY_INVITE_TOKEN_REQUIRED` (422), requires a recipient and
complete subject/message when `Send by Email` is selected (422), and increments
the survey `row_version` only after the invite insert succeeds. The focused
contract is `test/surveys_invite.integration.test.ts`: it verifies page/API
`page.id` joins, idempotent memory migration, seeded link/sent states, success,
recipient/message validation, archived, and stale-version responses. The
authenticated browser comparison used Odoo/Core3 at 1440x1000 and 390x844;
Odoo and Core3 Share modals have zero non-aborted failed requests. Captures
are retained under `/tmp/odoo-surveys-share-{desktop,mobile}[-email].png` and
`/tmp/core3-surveys-share-{desktop,mobile}[-email].png`.

Known visual/behavior limits for this bounded slice: Core3 uses the generic
server-form modal, so `Save` is shown instead of Odoo's email-only `Send`, all
composer fields are visible before the checkbox is selected, and the link and
message render as plain text controls rather than Odoo's clipboard/rich-mail
widgets. Recipients are deterministic text input and attachments are a
placeholder field; no contact many2many lookup, mail transport, template
rendering, or actual email delivery is claimed. The Core3 list action remains
in the generic list utility menu; the detail-form `Share` action is the
row-scoped evidence path. Screenshots are evidence only and are not committed.

## Certified stat cohort parity slice — 2026-09-11

The selected gap was the installed Odoo `Certified` stat on the survey form.
The live `core3_codex_demo` audit verified `survey` is installed with demo data;
action 278 is `Certifications Succeeded` on `survey.user_input`, with
`view_mode: list,form` and context `{'search_default_scoring_success': 1}`.
Survey 2, `MyCompany Vendor Certification`, reports `success_count: 2`.
Clicking its `Certified` stat at `/odoo/surveys/2` opens the Participants action
with the visible `Quiz passed` filter and exactly `1-2 / 2` successful attempts.

Before this slice Core3's `survey_certified_stats_detail` action navigated to
`/surveys/participants` with only `survey_id`, so it showed all attempts for
the certification rather than Odoo's succeeded cohort. The implementation is
limited to that proven action gap: the detail page now passes
`quiz_status: Passed` alongside `survey_id`. The existing page/API pair stays
separate (`pages/participants.yaml` and `api/participants.yaml`, both bound to
`survey-participants`), and the API already enforces the filter server-side
through its `:quiz_status` predicate and `surveys.read` permission. The two
passed certification fixtures remain deterministic in migration
`20260910193000-004-survey-participant-fixtures.yaml`; no new data or renderer
was invented for this action.

### Evidence and corrected runtime assets

All captures used authenticated headless Chrome at 1440x900 and 390x844. The
initial fresh-worktree Core3 mobile capture was invalid: generated ignored CSS
outputs were absent, so `/styles/global.css` returned the Vite HTML fallback
and the page rendered raw controls. Running `bun run css:build:global` and
`bun run css:build:surveys`, then restarting the isolated runtime with
`--css`, restored the global and Surveys styles. The corrected browser check
confirmed both stylesheets loaded, computed Inter typography and the Core3
surface background, `requestfailed: []`, `pageerror: []`, and exact body,
document, and viewport widths for every Core3 target.

| State | Odoo capture | SHA-256 | Core3 capture | SHA-256 |
| --- | --- | --- | --- | --- |
| Survey detail, desktop | `/tmp/odoo-surveys-certified-stat-detail-desktop-fresh-20260911.png` | `7719501ebcfb986bc760365f52575efd0c29362092249606269db9d25ab39f12` | `/tmp/core3-surveys-certified-stat-detail-desktop-styled-20260911.png` | `31e6f0c29d42a965f52d205f246f7324ccbe429d78377e733313356f14e1c925` |
| Survey detail, mobile | `/tmp/odoo-surveys-certified-stat-detail-mobile-fresh-20260911.png` | `7d9c3a78870dff2bdeb75fe69a8707d173a82185071a40b50a625514a4a65e6b` | `/tmp/core3-surveys-certified-stat-detail-mobile-styled-20260911.png` | `ed522c4bb94f8487114646732bb3b5cadb0ce365e76de3f6716596c9c9807c0f` |
| Certified cohort, desktop | `/tmp/odoo-surveys-certified-stat-desktop-fresh-20260911.png` | `0be123c7d0a0f3e875688779e0b30cef77b11264c63dd272d2f488de76d50aa4` | `/tmp/core3-surveys-certified-stat-desktop-styled-20260911.png` | `4d996f948982695c781caab241b3a81fc213b90e425561735b6d7c37c070498d` |
| Certified cohort, mobile | `/tmp/odoo-surveys-certified-stat-mobile-fresh-20260911.png` | `fe295d02ab144bab1249f761d1a5aba308ea34c99d9c53833afc45aaf8c5075e` | `/tmp/core3-surveys-certified-stat-mobile-styled-20260911.png` | `bfbdf520abf693bf1c8aceb1c3db8a7bdf9c4a89fd923ce7c86d53e412d78259` |

The corrected Core3 cohort route is
`/surveys/participants?survey_id=survey-demo-certification&quiz_status=Passed`
and renders two populated passed rows at both sizes. The responsive Core3
shell and Odoo purple shell remain intentional platform-level visual
differences; Odoo also switches its mobile participant action to a compact
list presentation. Screenshots remain outside Git.

## Source menu, action, view, and route inventory

The source menu tree in `views/survey_menus.xml` and the action/menu additions
in the other view files are:

| Visible menu/action | Source id/model | View modes or contract | Planned Core3 route |
| --- | --- | --- | --- |
| Surveys > Surveys | `action_survey_form` / `survey.survey` | `kanban,list,form,activity`; source also defines graph and pivot views for the model | `/surveys` |
| Surveys > Participants | `action_survey_user_input` / `survey.user_input` | `list,kanban,form`; default group by Survey; create disabled | `/surveys/participants` (route to be confirmed from installed Odoo) |
| Survey form > Certified | `action_survey_user_input_certified` / action 278 `Certifications Succeeded` | `list,form`; context `search_default_scoring_success: 1` | `/surveys/participants?survey_id=<id>&quiz_status=Passed` |
| Surveys > Questions & Answers > Questions | `action_survey_question_form` / `survey.question` | `list,form`; grouped by page; excludes section rows | `/surveys/questions` (confirm) |
| Surveys > Questions & Answers > Suggested Values | `survey_question_answer_action` / `survey.question.answer` | `list,form`; grouped by question | `/surveys/suggested-values` (confirm) |
| Surveys > Questions & Answers > Detailed Answers | `survey_user_input_line_action` / `survey.user_input.line` | `list,form`; grouped by survey and user input; technical detailed answers | `/surveys/detailed-answers` (confirm) |

The parent `Surveys` and `Questions & Answers` menus are defined in
`views/survey_menus.xml`; the child menus are defined in
`views/survey_survey_views.xml`, `views/survey_question_views.xml`, and
`views/survey_user_views.xml`. Child visibility follows `group_survey_user`
and the model access/security rules, not merely a frontend permission string.

### Backend view states and controls

- Survey list: title, responsible user/avatar, average duration, registered,
  completed, passed/certified, success ratio, average score, archived records,
  certification indicator, optional columns, search by title/session code or
  question/page, certification and archived filters, responsible/restricted
  user group-by, activities, pager, create/edit/delete, archive/reopen, and
  kanban color.
- Survey kanban: responsive cards, questions count, duration/registered/
  completed/passed statistics, activity card, Share, Test, See results, Start
  Live Session, End Live Session, Edit, Delete, archive ribbon, and color
  picker. Verify card actions change with active, certification, session, and
  permission state.
- Survey form: Share, See results, Create/Open/Close Live Session, Test,
  Reopen, Close, registered/certified/participant stat buttons, archived
  ribbon, survey type, title, responsible user, languages, restricted users,
  Questions and Options tabs, Description, End Message, and chatter.
  Questions supports page/section rows, drag sequence, add question, add
  section, duplicate question, question type preview, time limits,
  mandatory/conditional triggers, random selection, and per-page settings.
  Options covers layout/progression/roaming, access/login/attempt limits,
  time/scoring/certification/badge, live-session settings, and completion
  behavior. Verify all conditional visibility and readonly states.
- Question form: section versus question mode, title/description, background
  image, question types `simple_choice`, `multiple_choice`, `text_box`,
  `char_box`, `numerical_box`, `date`, `datetime`, `matrix`, and `scale`,
  suggested answers, correct answers and scoring, comments, mandatory and
  validation constraints, conditional display triggers, matrix rows/columns,
  and image/answer ordering. Suggested Values list/form supports value,
  question, sequence, score, and matrix row/column relations.
- Participants list/kanban/form: new/in-progress/completed states, participant,
  partner, email, survey, language, deadline, attempts, test-entry, score and
  passed state; filters New/In Progress/Completed/Quiz passed/Tests only/
  Exclude Tests; group by survey/email/partner/language; resend invitation,
  print completed answers, attempts stat button, answer lines, skipped answers,
  score, and passed/failed/test ribbons. No create action.
- Detailed Answers: readonly answer-line list/form with survey, attempt,
  question, date, answer type, skipped, text/numeric/date/datetime/value and
  score fields; no create action and technical permission boundary.
- Results and live session: See results opens authenticated result/statistics
  pages with answer filters, per-question summaries, charts/tables, scores,
  completed participants, print/download certification/report, and empty/no
  answer states. Create Live Session/Open Session Manager/Close Live Session
  cover session code, next/back question, answers, timer, live charts,
  leaderboard, participant state, and end-session behavior.
- Invite wizard: public survey link copy, send toggle, existing contact/email
  recipients, resend/new token choice, subject/body/template, attachments,
  deadline, validation, send, and close. Partner form gains succeeded
  certifications and the certification report action.

### Public and authenticated HTTP contracts

These are separate from backend action routes and must be explicitly scoped:

- Public survey flow: `/survey/start/<survey_token>`,
  `/survey/<survey_token>/<answer_token>` and its `/page/<int:page_id>` form,
  `/survey/begin/<survey_token>/<answer_token>`,
  `/survey/next_question/<survey_token>/<answer_token>`,
  `/survey/submit/<survey_token>/<answer_token>`, and
  `/survey/print/<survey_token>`.
- Public/session helpers: `/survey/<survey_token>/get_background_image`,
  `/survey/<survey_token>/<int:section_id>/get_background_image`,
  `/survey/get_question_image/<survey_token>/<answer_token>/<question_id>/<suggested_answer_id>`,
  `/s`, `/s/<session_code>`, and
  `/survey/check_session_code/<session_code>`.
- Authenticated test/results/certification: `/survey/test/<survey_token>`,
  `/survey/<survey>/certification_preview`,
  `/survey/<survey>/get_certification_preview`,
  `/survey/<int:survey_id>/get_certification`, and
  `/survey/results/<survey>`.
- Authenticated live-session management: `/survey/session/manage/<survey_token>`,
  `/survey/session/next_question/<survey_token>`,
  `/survey/session/results/<survey_token>`, and
  `/survey/session/leaderboard/<survey_token>`.

Future tests must use access tokens only through the intended public/authorized
flow, reject missing/expired/wrong-survey tokens, and never expose an
unscoped Core3 survey endpoint. Exact installed action aliases and routes must
be recorded from Odoo after installation rather than inferred from this list.

## Existing Core3 gap

`services/surveys` currently has `manifest.yaml`, `storage.yaml`,
`permissions.yaml`, two migrations, styles, and pages `surveys`,
`survey-detail`, `survey-workflow`, and `analysis`. It currently stores only
`surveys`, `survey_questions`, and `survey_responses`, owns SQL in page YAML,
uses `CURRENT_TIMESTAMP`, exposes `/surveys` and `/survey-analysis`, and uses
the generic `order_transition` handler. It lacks the Odoo model graph,
participants/answer lines, question answers/pages, scoring/certification,
invite/session/public flows, reports, chatter/activities/attachments,
security groups, archived semantics, and all source menu children. The
current `survey-analysis` totals/bar chart is not evidence of Odoo parity.

## Deterministic Core3 fixture/API contract

Future implementation must make pages layout-only and add convention-discovered
`services/surveys/api/*.yaml` fragments keyed by `page.id`; do not add API
fragments to a frontend `pages:` manifest. Use service operations for contacts,
users, mail/activity, attachments, reports, sessions, and public token flows.
Every list, form, kanban, activity, report/chart, public survey, live session,
invite, and empty/error state declares stable `mock_data` until a real query
exists. No page-local records, random IDs, current-time SQL, browser fixtures,
remote assets, or live Odoo calls.

Use seed date `2026-01-15`, stable IDs/order, idempotent migrations, and preserve
relative demo semantics. The fixture set must include:

- Feedback Form, MyCompany Vendor Certification, and Burger Quiz; draft,
  active, archived, public, restricted, certification, scored/no-score,
  one-page/page-per-question/page-per-section, random and conditional forms.
- Sections/pages and every question type; suggested values, correct answers,
  matrix rows/columns, comments, images, mandatory/optional, time limits,
  progression, attempt limits, languages, responsible/restricted users,
  scoring thresholds, certification badge/report, and completion messages.
- Participants in new/in-progress/completed, passed/failed, test, skipped,
  deadline/expired, multiple-attempt, and empty states, with answer lines for
  text, numeric, date, datetime, scale, choice, and matrix values.
- Live sessions in ready/in-progress/closed, session code/link, current
  question, timer, answer counts, leaderboard, no participants, and denied or
  expired session-token states.
- Invite recipients, existing-token resend/new-token choices, templates,
  attachments, deadline, send success, validation failure, and mail failure.

The API must implement stable create/edit/duplicate/archive/reopen, question
ordering, publish/test/share/results, invite, participant resend/print,
session start/next/back/end, public begin/submit/retry/print, report/download,
optimistic row-version conflict, and validation errors. Use explicit 401/403/
404/409/422 responses and permission-filtered queries; do not emulate access
groups with hidden buttons alone.

## Shared primitives to verify before module-specific UI

Reuse and test the generic `ListView`, responsive kanban/card, `FormView`/
`OdooFormView`, `ActivityView`, search/filter/group-by/sort/pager/favorites,
optional columns, saved views, status/ribbon/chip, notebook/tabs, stat buttons,
many2one/many2many tags/avatar, inline one2many reorder/editor, rich text,
image/file upload, progress/score/chart/table/report download, mail invite
composer, chatter/followers/activities/attachments, public form, session/live
polling, and mobile action-menu primitives. Also verify loading/empty/error,
401/403/404/409/422, validation, unsaved-change, and row-version conflict
contracts. If a primitive is absent, document its generic API and isolate its
test before adding a Surveys-specific renderer. Preserve Odoo content-only
mobile scrolling and no horizontal overflow.

## Duplicate action parity slice — 2026-09-11

The selected uncovered authenticated action was the Odoo Surveys form Actions
menu > Duplicate action on `Feedback Form`. The installed Odoo reference was
`http://localhost:8069/odoo/surveys/1`, database `core3_personal`, authenticated
as `codex@core3.local`; the isolated Core3 capture used the worktree runtime at
`http://localhost:3003/surveys/detail?id=survey-demo-feedback`, backend port
3013, authenticated as `admin@tms.local`. The active parent checkout retained
port 3002, so it was not disturbed. Temporary Odoo copies were deleted after
the desktop and mobile reference captures. Screenshots remain under `/tmp`
only and are not repository artifacts.

Implementation is YAML-first and page/API separated: `page.id: survey-detail`
owns the declarative `action_menu` and permissioned client action
`duplicate_survey_detail`; `services/surveys/api/survey-detail.yaml` owns the
permissioned `duplicate_survey` server action at
`surveys.records.duplicate`. The transaction copies the survey definition,
ordered questions, and suggested values, while assigning a fresh ID/token,
resetting Draft/response count/dates, and enforcing not-found, archived, and
stale-row guards. The generic OdooFormView action-menu primitive filters
permissioned actions before render; its mobile overflow/stacking refinement is
included in the implementation commit.

Focused verification: `bun test test/surveys.integration.test.ts` — **15 pass,
0 fail, 155 expect() calls**. The test asserts YAML page/API wiring, action
labels, deterministic duplicate title/state/token, copied question and answer
counts, source immutability, and 404/409 archived/stale guards.

### Browser evidence

All captures used authenticated headless Chrome at the exact viewport shown;
the four Core3 result captures navigated to a new `Feedback Form (copy)` in
Draft with zero responses. The Odoo menu exposes `Duplicate`, `Archive`,
`Delete`, and `Print Survey`; Core3 exposes the selected permissioned
`Duplicate` action. Desktop Core3 captures had no horizontal overflow and the
final mobile result capture had no horizontal overflow; no failed requests or
page errors were recorded after entering the Surveys route.

| State | Odoo path | SHA-256 | Dimensions | Core3 path | SHA-256 | Dimensions |
| --- | --- | --- | --- | --- | --- | --- |
| Actions menu, desktop | `/tmp/odoo-surveys-duplicate-menu-desktop-20260911.png` | `cd6c02092d48cb584f8fc80459034d374fb20050733e15463f2f9463420e0d60` | 1440x900 | `/tmp/core3-surveys-duplicate-menu-desktop-20260911.png` | `1a4b2889f21b7ab9eea049c9fdd61120b10020c21b8631c91d4f065da19b4fc8` | 1440x900 |
| Duplicate result, desktop | `/tmp/odoo-surveys-duplicate-result-desktop-20260911.png` | `a9857eb293ce6e15ca9a8115463907734cfaaeea36b2067d9cb35aa5544ee1a0` | 1440x900 | `/tmp/core3-surveys-duplicate-result-desktop-20260911.png` | `8f389372dc768f07232158b1557767887c555fc7a62cb481d112ba8096a062be` | 1440x900 |
| Actions menu, mobile | `/tmp/odoo-surveys-duplicate-menu-mobile-20260911.png` | `4c50b1320a2e5ec4af079fed5b865d2f20476cf85447fc37fc4fd2b36cf1edeb` | 390x844 | `/tmp/core3-surveys-duplicate-menu-mobile-20260911.png` | `7da97dcebc609865d11be20918946f6a45c71cd368120c16a91c9dca23af9d78` | 390x844 |
| Duplicate result, mobile | `/tmp/odoo-surveys-duplicate-result-mobile-20260911.png` | `686133b7ee8353d108cefff8d7cb22c6db085a0c5385161b54c2567f00afa4e7` | 390x844 | `/tmp/core3-surveys-duplicate-result-mobile-20260911.png` | `b8bff92698643df276a1bdf88146d67f892c74aefa26a1727825c151e70a9d8b` | 390x844 |

Behavior comparison: both authenticated forms keep the source survey intact,
create a new route/record titled `Feedback Form (copy)`, preserve the ordered
question definition, and reset participants/responses to zero and state to
Draft. Odoo presents the action menu as a desktop dropdown and mobile bottom
sheet; Core3 presents the same action through the reusable OdooFormView menu,
with the desktop dropdown and result navigation captured. Core3's compact
mobile action strip keeps the Actions control visible, but the captured mobile
menu frame does not visibly show the dropdown item; this remains a visual
residual for the next slice despite the focused action and mobile result
behavior passing.

Residual mismatches: Core3 currently exposes only Duplicate in this bounded
menu, while Odoo also exposes Archive, Delete, and Print Survey (existing Core3
archive/lifecycle actions remain in the form action bar). Core3's seeded
Feedback Form has seven questions and no Odoo section rows, so duplication
preserves the Core3 fixture graph rather than the reference's two section rows.
Generic Odoo typography/chatter and the remaining Surveys menu/actions are
outside this slice.

## Print Survey form action parity slice — 2026-09-11

The next genuinely uncovered visible Surveys action was the installed Odoo
form Actions menu > `Print Survey` action on `Feedback Form`. The reference
was audited at `http://localhost:8069/odoo/surveys/1` in database
`core3_user_demo` as `admin@core3.local` after the official Surveys demo data
was installed. Odoo opens the public token-scoped print route
`/survey/print/<access_token>` in a new tab; the form menu label is exactly
`Print Survey`, and the action is defined by Odoo's `action_survey_print`
server action.

Core3 adds the permissioned `print_survey_detail` client action to the
`survey-detail` page's declarative form Actions menu. It requires
`surveys.read`, reads the service-owned `access_token` from the selected row,
and opens `/survey/print/<encoded-token>` with a new-tab target. The page
contract remains separate from `services/surveys/api/survey-detail.yaml` and
is joined through the shared `page.id: survey-detail`; no frontend-owned
survey or token fixture was added. The existing public print API remains
responsible for published/closed visibility, deterministic questions and
answers, wrong-token/invalid-token errors, empty questions, review mode, and
print rendering.

The browser comparison also corrected the printable surface within this
action's route: the default view no longer shows review-only `Take Again`,
synthetic section headings, or a generic print-page heading, and its control
uses the shared printer icon. Authenticated headless Chrome captured both
the Odoo action menu and the resulting Core3 print route at exact 1440x900
and 390x844 viewports. Both Core3 captures had zero failed requests and page
errors after route load, and neither viewport had horizontal overflow.

### Browser evidence

Screenshots are evidence only and remain under `/tmp`; no image is committed.

| State | Odoo path | SHA-256 | Dimensions | Core3 path | SHA-256 | Dimensions |
| --- | --- | --- | --- | --- | --- | --- |
| Actions menu, desktop | `/tmp/odoo-surveys-actions-menu-desktop-20260911.png` | `a8e3d0e542fe5e0ba8e6f0f9adf94e7b24b962b37c4fcfeabfcab0c2c11e271b` | 1440x900 | `/tmp/core3-surveys-print-action-menu-desktop-20260911.png` | `a3b50d7f37ac6d9434f4346f16ed89e1d97efbb62d25220bf51271dbba04a142` | 1440x900 |
| Printable result, desktop | `/tmp/odoo-surveys-print-result-desktop-20260911.png` | `2ad38984e8afa923ff1eca97bbb6c7e67ce37fad280909322c32df4748b0a449` | 1440x900 | `/tmp/core3-surveys-print-action-result-desktop-20260911.png` | `ca48ec70ccf8420972104b1431e9b5ae9d5c45d52c59f964d6e00b9a539e624e` | 1440x900 |
| Actions menu, mobile | `/tmp/odoo-surveys-actions-menu-mobile-20260911.png` | `afe678b8ba5348ab70b939d42f20819b0327ac4f6713c1cbb614f644c1b9a727` | 390x844 | `/tmp/core3-surveys-print-action-menu-mobile-20260911.png` | `411d5f73f139c0819f65a87e3d3a46ba3119dae339e3a12af0c35a178ea55493` | 390x844 |
| Printable result, mobile | `/tmp/odoo-surveys-print-result-mobile-20260911.png` | `f5b8a38b8c34d1cbba5bae3fc2eea0878d7b9b8e703ed88b7180804771b05414` | 390x844 | `/tmp/core3-surveys-print-action-result-mobile-20260911.png` | `feff9cd292ef66ccb0022f6c6eb9cbbe27d3e83ecc05d2dfdccbbe5c8f31943d` | 390x844 |

The bounded implementation does not claim Odoo's remaining `Archive` and
`Delete` menu actions or its mobile bottom-sheet menu shell. The seeded
Core3 Feedback Form also has its approved seven-question fixture without the
reference demo's `About you` section rows; those are separate parity work.
Focused coverage is in `test/surveys.integration.test.ts` and
`test/surveys_print.integration.test.ts`.

## Delete Survey form action parity contract — 2026-09-11

The next genuinely uncovered visible action is the installed Odoo Surveys
form Actions menu > `Delete` action. The live reference was verified in
`core3_user_demo` at `http://localhost:8069/odoo/surveys/6` as
`admin@core3.local`; the temporary copy was removed after inspection. Odoo's
form menu exposes `Delete` beside `Duplicate`, `Archive`, and `Print Survey`,
and clicking it opens the confirmation copy `Bye-bye, record!`,
`Ready to make your record disappear into thin air? Are you sure?`, and
`It will be gone forever!`. Confirming invokes the generic ORM `unlink` on
`survey.survey`; the source model has cascade relations for questions,
responses, and answer lines, so the bounded Core3 action must remove the
survey-owned definition graph atomically.

The slice will add only `Delete` to the existing `survey-detail` Actions menu.
The layout page remains presentation-only and keeps `page.id: survey-detail`;
the matching `api/survey-detail.yaml` owns the permissioned
`surveys.records.delete` mutation. A small client action will confirm the
row-scoped deletion, invoke the named API action, and return to `/surveys` so
a deleted detail record cannot remain mounted. It requires `surveys.write`,
passes the selected `id` and `expected_row_version`, and refreshes through the
existing Surveys list route. It does not add bulk deletion, archive behavior,
trash/recovery, or a new renderer.

Deterministic migration fixtures will add one `Delete Candidate Survey` with
one question, one suggested value, no responses, and a fixed token. The
mutation contract covers successful graph deletion, missing survey (404),
stale row version (409), and permission denial (403); the list contract covers
the post-delete empty/search-no-match state. Focused tests will verify the
page/API `page.id` join, confirmation/action labels, fixture graph, child
cascade, guards, no-op preservation after stale/denied requests, and empty
list query. Browser evidence must capture the authenticated Odoo menu and
confirmation plus authenticated Core3 menu, confirmation, and post-delete
list at 1440x900 and 390x844. Screenshots remain under `/tmp` only.

## Acceptance and evidence required before `ready`

The future audit must run clean install, migration, restart, upgrade, and demo
on/off checks, then use authenticated Odoo and Core3 at 1440x900 and 390x844.
It must navigate every visible menu/action above, assert title/route/view mode,
compare representative list/kanban/form/question/participant/result/session/
invite/public/empty/error states, and retain screenshots plus failed-request
lists under `/tmp` only.

- Functional: search, filters, group-by, sort, pager, favorites, optional
  columns, CRUD/duplicate/archive/reopen, question reorder, workflows, invite,
  scoring/certification, participant answers, reports, sessions, public submit,
  retry/print, and download all work with deterministic fixture IDs.
- Security: ordinary user/officer/manager/admin boundaries match
  `survey_security.xml`; restricted surveys and contacts are filtered server
  side; technical detailed answers, report, session management, and invite
  operations do not leak through direct API calls. Verify denied, missing,
  expired, wrong-token, conflict, invalid-answer, and missing-required-question
  responses.
- Empty/error: no surveys, no questions, no participants, no answers, no
  session, no search result, archived-only, expired link, mail failure, report
  failure, 401/403/404/409/422, loading, retry, and unsaved/conflict states have
  stable copy and no blank/crashing surface.
- Mobile: at 390x844 the public survey, question types, matrix, result/session,
  invite, list, form tabs, action menus, and error dialogs fit without
  horizontal scrolling; touch targets remain usable and only the content area
  scrolls. Desktop uses the full 1440x900 viewport without clipped controls.
- Visual: compare authenticated Odoo and Core3 after installed reference
  capture for menu hierarchy, typography, spacing, ribbons/chips, cards,
  notebook/statusbar, question controls, charts, public survey progress,
  session/leaderboard, loading/empty/error, and mobile reflow. Record route,
  database, user/groups, demo flag, source revision, viewport, and failed
  requests with each screenshot.

Keep this file and the parent register at `in-progress` until the remaining
acceptance checks pass; do not use the fallback Discuss screenshots as
installed UI evidence.

## Bounded slice: Survey Delete action (2026-09-11)

The active Odoo 19 Survey form exposes Delete in the Actions menu for the
selected survey. Core3 adds the matching `delete_survey_detail` action to the
existing `survey-detail` page/API pair, requiring `surveys.write`, optimistic
row-version checks, and dependent-graph cleanup for questions, participants,
responses, detailed answers, invitations, suggested values, and live sessions.
The page/API ownership remains joined by `page.id`; no new route or page
renderer is introduced.

Implementation commit: `ce155916` (`feat(surveys): add guarded delete action`)
after contract commit `dbc98d90`. Focused coverage passes 2 tests and 25
assertions, covering the visible Actions menu contract, successful graph
deletion, empty-list behavior, missing records, stale writes, and the
permission boundary.

Authenticated Core3 browser verification used `admin@tms.local` against
`/surveys/detail?id=survey-demo-feedback` at 1440x900 and 390x844. The detail
form and Actions menu visibly include Delete, both viewports have exact
document/body widths, and no page errors, failed requests, or HTTP error
responses were observed. Odoo reference captures cover the corresponding
menu at both target viewports; images remain outside Git:

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Survey Actions menu | 1440x900 | `/tmp/odoo-surveys-delete-menu-desktop-20260911.png` | `0c25d6b2af48f56d6aea2e4a3a9506673a8a29db7d628226503861c3029d9876` |
| Odoo Survey Actions menu | 390x844 | `/tmp/odoo-surveys-delete-menu-mobile-20260911.png` | `cf29e9316443f74026ee7e2360d0d32aaea7de74fc6a020b9f7c8449e35359fa` |
| Core3 Survey detail/actions | 1440x900 | `/tmp/core3-surveys-delete-menu-current-1440x900.png` | `41b47b90c3b62c1ec2287d5eac2e63307afc11c4f43036fa7b03bd509c6f0262` |
| Core3 Survey detail/actions | 390x844 | `/tmp/core3-surveys-delete-menu-current-390x844.png` | `61eb3c71b53205a84b2cfbf8903bc1efe900b9f7808078e023a4d528edfc2702` |

The documented residual is Odoo's native confirmation/menu shell versus the
shared Core3 Actions menu and confirmation flow. Images are not committed.

## Bounded slice: Participants stat completed cohort (2026-09-12)

The installed Odoo Survey form distinguishes the `Registered` stat, which
opens all participant attempts, from the `Participants` stat, which opens the
completed cohort with the visible `Completed` facet. Core3 now exposes both
stat buttons: `Registered` routes to the unfiltered participant list and
`Participants` routes to `/surveys/participants` with `state=Completed`.
The detail datasource adds the deterministic `completed_count` aggregate and
the page/API contract remains joined by `page.id`.

The focused suite passes 18 tests with 175 assertions and the UI audit passes
with 545 pages, 552 routes, and 947 datasources. The authenticated Odoo
reference was captured from the installed disposable Survey database at
1440x900 and 390x844. A fresh Core3 browser comparison was not accepted:
the isolated runtime resolved to the MovedX shell during login instead of the
Core3 auth surface. No screenshot is claimed for that failed run and no image
is committed. The overall Surveys module remains `in-progress`.

## Registered participants stat bounded slice (2026-09-12)

The installed Odoo Survey form distinguishes `Registered` from the completed
`Participants` cohort: Registered opens every participant attempt, including
in-progress attempts. Core3 now exposes a deterministic `registered_count`,
keeps the stat navigation on the existing participant page, and declares the
registered datasource transport failure contract. The page/API pair remains
joined by `page.id`; the migration adds only fixed, idempotent participant
fixtures.

Focused validation passes 19 tests with 185 assertions; the UI audit passes
with 578 pages, 585 routes, and 996 datasources. An authenticated browser
comparison was attempted under `/tmp/core3-odoo-parity/surveys-batch4-20260912/`,
but the isolated runtime did not expose a reachable Core3 listener, so no
authenticated Core3 screenshot or full visual-parity claim is made. Images,
if produced during the attempt, remain outside Git.

## Bounded slice: Participant Attempts stat (2026-09-12)

The next uncovered participant action in the installed Odoo 19 source is the
readonly participant form's `Attempts` stat. In
`addons/survey/views/survey_user_views.xml`, `action_redirect_to_attempts` is
visible only when `attempts_count != 1`; its action reopens
`survey.action_survey_user_input` (`Participants`, `list,kanban,form`) with
`create=false`, the current survey, and the participant contact or email as
the identity scope. The model implementation in
`models/survey_user_input.py` counts completed, non-test attempts for the same
survey and partner/email. This slice adds only that existing action to the
Core3 participant detail form; it does not create a new route or renderer.

Core3's page and API remain separate and joined by
`page.id: survey-participant-detail`. The API adds `attempts_count`, and the
existing Participants datasource accepts exact `survey_id`, `contact`, and
`email` scopes. Migration `20260912110000-014-survey-attempts-stat-fixture.yaml`
adds one fixed-date completed second attempt for Azure Interior; it is
idempotent with `ON CONFLICT DO NOTHING` and uses the existing deterministic
seed date `2026-01-15`.

Acceptance coverage includes: the Attempts stat is permissioned and hidden
for a single attempt; a repeat participant reports count 2 and navigates to
the two matching attempts; a no-match identity returns an empty list; the
existing 401/403/404/503 datasource contracts remain unchanged; and the
existing optimistic participant workflow actions retain their stale/conflict
guards. Focused Bun coverage is in `test/surveys.integration.test.ts`.

The required authenticated Odoo/Core3 visual pass is assigned to
`/tmp/core3-odoo-parity/surveys-batch5-20260912/` at 1440x900 and 390x844.
This agent session has no `js_repl` capability, so the persistent
`playwright-interactive` browser workflow cannot run here; no authenticated
Core3 screenshot or visual-parity claim is made for this batch. Any runtime
attempt artifacts remain outside Git.

## Bounded slice: Survey form Archive Actions-menu parity (2026-09-12)

The next visible gap after the Attempts stat was the Odoo Survey form
Actions-menu `Archive` entry. The exact source trace is Odoo 19 revision
`65975996`: `addons/survey/views/survey_survey_views.xml` defines the form
header `action_archive` object button with visible label `Close` and
`action_unarchive` with visible label `Reopen`; the generic Odoo form action
menu contributes the row-scoped `Archive` entry beside `Duplicate`, `Delete`,
and `Print Survey`. The model implementation is
`addons/survey/models/survey_survey.py:523-529`, where `action_archive` and
`action_unarchive` persist the active state (and archive/unarchive a linked
certification badge). The action is available only for an active survey and
requires the survey model write/security boundary.

Core3 now exposes the existing guarded `archive_survey_detail` workflow in
the `survey-detail` form `action_menu` with the exact visible label `Archive`.
The page remains presentation-only and the API/action ownership remains
separate, joined by `page.id: survey-detail`; it reuses
`surveys.records.archive`, `surveys.manage`, the existing state predicate,
row-scoped `state.id`, refresh, and the existing deterministic Archived and
Reopen lifecycle. No new mutation, fixture, route, or renderer was added.

Focused coverage in `test/surveys.integration.test.ts` verifies the page/API
join, exact menu label/icon/permission/state visibility, and reuse of the
server workflow action. `git diff --check` is clean.

The required authenticated Odoo/Core3 browser comparison was attempted for
this worktree under `/tmp/core3-odoo-parity/surveys-batch6-20260912/` at
1440x900 and 390x844. This agent session does not expose the required
persistent Playwright `js_repl` capability, so authenticated browser capture
could not run. No Odoo or Core3 screenshot, runtime request result, or visual
parity claim is made for this slice; any attempt artifacts remain outside Git.

## Bounded slice: Questions-tab Add a section (2026-09-12)

The next uncovered visible survey-form control is Odoo's inline Questions tab
`Add a section` create entry from `addons/survey/views/survey_survey_views.xml`.
Its context sets `default_is_page=True` and
`default_questions_selection='all'`; the created `survey.question` remains in
the ordered `question_and_page_ids` graph and is rendered as a section row.
Core3 models this single control with the existing shared `LineItemGrid`,
keeping the `survey-detail` page/API fragments joined by `page.id`. The API
action `surveys.questions.add_section` requires `surveys.write`, scopes the
insert to the current survey, appends the next stable sequence, marks the row
as `is_page`, increments the parent row version, and rejects archived,
stale, empty-title, and failed inserts with explicit 409/422 contracts.

Migration `20260912130000-015-survey-sections.yaml` adds the idempotent
`is_page` field and the deterministic conditional-survey section fixture
`section-conditional-profile`. No question renderer, public flow, section
navigation, or unrelated CRUD action is included.

Focused validation: `bun test --max-concurrency 1 test/surveys.integration.test.ts`
passes 22 tests and 215 assertions; `bun run audit` passes with 633 pages,
649 routes, and 1085 datasources; `git diff --check` is clean. The required
authenticated Odoo/Core3 capture attempt was made under
`/tmp/core3-odoo-parity/surveys-sections-20260912/` for 1440x900 and 390x844.
Odoo responded with a redirect on port 8073, but this worktree's Core3 start
could not claim its requested port: the launcher found port 3001 busy and
selected the already-owned parent runtime on 3002, while the isolated process
was terminated after the bounded attempt. Because no authenticated isolated
Core3 browser surface was available, no Odoo or Core3 screenshot or visual
parity claim is made for this slice; the runtime log and response probe remain
outside Git.

## Bounded slice: Live-session current-question results (2026-09-20)

The next source-backed host workflow after the existing live-session
Create/Start/Next/Close coverage is Odoo's
`/survey/session/results/<survey_token>` controller in
`addons/survey/controllers/survey_session_manage.py`. Odoo exposes these
statistics only while a session is `in_progress`, scopes them to the current
question, and returns answer counts, choice statistics, and text/date
responses for the host view.

Core3 adds the page/API pair `survey-live-session-results` at
`/surveys/live-session-results`. The existing live-session manager exposes a
permissioned `Show results` action while the session is in progress. Three
read-only service-owned datasources provide the current-question header,
choice response breakdown, and text response rows. All result sources require
`surveys.read`; navigating from the host requires `surveys.manage`.

Migration `20260920140000-018-survey-live-results.yaml` adds durable,
idempotent `survey_live_attendees` and `survey_live_session_answers` tables,
with fixed Feedback Form attendees and answers for the first question. The
focused contract verifies migration replay, current-question scoping, choice
aggregation, empty and transport-error states, and the closed-session guard.
Leaderboard, public `/s/<session_code>` joining, attendee answer submission,
and question-by-question live polling remain separate open gaps.

Focused validation passes 2 tests with 16 assertions in
`test/surveys_live_results.integration.test.ts`; the Surveys migration subset
passes 5 tests with 27 assertions. `bunx eslint` and `git diff --check` pass.
The repository audit remains blocked by an unrelated pre-existing Inventory
schema error (`back_to_inventory_package` duplicate action and illegal label);
that module's uncommitted files were preserved and are outside this slice.

## Bounded slice: Questions-tab Add a question (2026-09-20)

The next genuinely uncovered visible Survey-form control after the existing
`Add a section` slice is Odoo's inline Questions-tab `Add a question` control.
The source is `addons/survey/views/survey_survey_views.xml` lines 75-100:
`question_and_page_ids` uses `question_page_one2many`, passes
`default_survey_id`, and exposes `add_question_control` beside
`add_section_control`. Odoo appends a normal `survey.question` row to the
ordered parent graph; question creation remains governed by Survey user/write
access and the parent survey context.

Core3 adds `add_survey_question` to the existing `survey-detail` page
`LineItemGrid` and declares its backend separately in
`services/surveys/api/survey-detail.yaml` as the permissioned
`surveys.questions.create_inline` server form. The mutation is parent-scoped,
computes the next sequence from durable `survey_questions`, creates a normal
question with deterministic defaults, increments `surveys.row_version`, and
rejects blank titles, unsupported types, stale parents, archived surveys, and
failed inserts with explicit 422/409 contracts. The existing schema and
Feedback Form fixture already provide the Odoo-derived question graph, so no
new migration is needed.

Focused CRUD, permission, validation, and restart coverage is in
`test/surveys_question_create.integration.test.ts` (3 tests, 17 assertions).
Authenticated Core3 desktop/mobile evidence, QA inventory, source comparison,
and truthful authenticated Odoo fallback captures are under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-QUESTION-CREATE-001/`.
The Odoo reference database used for this run has Surveys uninstalled and
redirects `/odoo/surveys` to Discuss; that fallback is recorded explicitly and
is not a paired visual sign-off. The overall Surveys module remains
in-progress.

## Bounded gate repair: DuckDB dependent-response rollback (2026-09-20)

The current gate blocker was the DuckDB rollback/dependent-entry path around
Surveys migration `0.0.17`. The active repair in
`20260913100000-016-survey-public-idempotency.yaml` drops the indexes that
depend on `survey_responses` before removing `idempotency_key`, then recreates
the earlier access-token and survey indexes. This follow-up adds an explicit
access-token-bearing response row to the rollback regression and verifies that
its relation, answer data, token, state, and dependent indexes survive
rollback to `0.0.16` and replay to the current chain.

This is a bounded persistence/gate repair, not a new UI surface. Existing
YAML-first Survey contracts remain the source of truth: `surveys.read` protects
catalog reads, `surveys.write` protects mutations, and file-backed restart
tests cover durable state after reopen. The authenticated Admin/Fleet browser
matrix and desktop/mobile Survey-detail smoke evidence are captured under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-MIGRATION-ROLLBACK-001/`.

The full Surveys suite now passes 45 tests with 374 assertions. The full
repository regression completed with 1,379 passed and 3 unrelated failures in
CRM/Ecommerce expectations caused by concurrent owner changes. The current
Odoo reference database remains authenticated but has Surveys uninstalled;
`/odoo/surveys` redirects to Discuss, so the Odoo captures are recorded as
exact fallback blocker evidence and no paired visual sign-off is claimed.

## Bounded slice: Authenticated actor mutation matrix (2026-09-20)

The next unfinished acceptance slice was the authenticated actor matrix around
the existing Survey-detail question mutation. This is a bounded source-backed
workflow check, not a new service surface: Odoo's Survey form Questions tab is
write-enabled for Survey users, while ordinary users must not read the
Survey catalog and unauthenticated visitors must enter through the login
boundary. Core3 keeps the page/API split in `survey-detail` and protects the
inline mutation with `surveys.write`.

Fresh authenticated Core3 probes completed the real browser mutation at
1440x1000 and 390x844. Administrator creation persisted across reload (desktop
sequence 8, mobile sequence 9), with no page/request/HTTP errors or overflow.
Fleet received a 403 for `/surveys` with no survey disclosure, and anonymous
mobile navigation redirected to `/auth/login?redirect=%2Fsurveys`. The browser
captures and exact source comparison are in
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-ACTOR-MATRIX-001/`.

The full Surveys suite and the migration rollback/replay gate remain green.
The repository regression completed with 1,330 passed and 66 failed across
1,396 tests; its red results are shared concurrent failures: invalid filter
option fields in page YAML, Inventory migrations hitting DuckDB's unsupported
constrained-column ALTER, and concurrent CRM fixture-order expectations. The
Surveys Delete red entry is the shared page-discovery error and does not
reproduce in the isolated Surveys glob. Exact counts and disposition are
recorded in the QA ledger. Authenticated
Odoo desktop/mobile probes reached the server but `/odoo/surveys` redirected
to Discuss because Surveys is uninstalled in `core3_reference`; the fallback
captures are blocker evidence, not paired visual sign-off. Surveys remains
conditional and unsigned-off.

## Bounded slice: Participant invitation/resend lifecycle (2026-09-20)

`SURVEYS-PARTICIPANT-INVITE-001` implements the smallest remaining source-backed
participant workflow: an administrator can send an invitation for a New
participant and resend it for an In Progress participant. The Core3 API keeps
the page and action contracts separate, persists the invitation count/state and
deterministic sent-at value, protects the actions with `surveys.write`, and
rejects invalid state, missing-email, and stale replay requests without
mutation. File-backed DuckDB restart coverage proves the state survives reopen.

The Odoo source comparison is grounded in
`addons/survey/views/survey_user_views.xml` (the resend action is shown for
non-completed participants) and
`addons/survey/models/survey_user_input.py` (the resend action opens the invite
composer with resend mode). Fresh authenticated Core3 desktop/mobile captures,
Fleet denial, anonymous login boundary, and paired Odoo participant-list
captures are under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-PARTICIPANT-INVITE-001/`.

The live `core3_reference` Odoo probe found Surveys installed, correcting the
older uninstall note in historical entries. Its participant action currently
contains only Completed fixtures, so no New/In Progress row exposes Odoo's
resend control for a live mutation comparison. This slice therefore remains
**qa-in-progress / conditional**; no parity sign-off is claimed.

## Bounded slice: Public response restart lifecycle (2026-09-20)

`SURVEYS-PUBLIC-RESPONSE-RESTART-001` closes the next smallest source-backed
public workflow: an unauthenticated respondent starts a published survey,
saves progress, resumes after a file-backed DuckDB restart, submits once, and
replays the same submit idempotency key. The Core3 controller keeps token
validation and public route handling in `services/surveys/module.ts`, while
the page layout and backend API/action contracts are separate YAML fragments.
The public actions now declare `surveys.public`; submit guards require an
in-progress response and persist the deterministic fixture timestamp
`2026-01-15 09:30:00`.

The source comparison follows Odoo's public `/survey/start`, `/survey/retry`,
`/survey/begin`, `/survey/next_question`, `/survey/submit`, and `/survey/print`
routes in `addons/survey/controllers/main.py`. Core3 evidence covers
authenticated desktop/mobile browser interaction through the submitted
response screen, while the paired authenticated Odoo survey reaches its
host-controlled landing page and reports: “The session will begin
automatically when the host starts.” This is recorded as a precise reference
fixture blocker, not as a parity sign-off. Focused service/restart tests and
all evidence are recorded under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-PUBLIC-RESPONSE-RESTART-001/`.

Surveys remains **qa-in-progress / conditional** pending the broader public
retry/print/report matrix, complete repository regression, and an Odoo
host-started response comparison.

## Bounded slice: Survey results print report (2026-09-20)

Feature ID: `SURVEYS-RESULTS-PRINT-001`.

Odoo source comparison: the authenticated controller in
`addons/survey/controllers/main.py:731-764` renders filtered survey
statistics at `/survey/results/<survey>`; `survey_survey.py:1088-1095`
opens that results route from the survey action; and
`views/survey_templates_statistics.xml:25` provides the authenticated Print
button. Core3 mirrors this seam with a layout-only `survey-results` page and
the page-id-bound `api/survey-results.yaml` fragment. Its `surveys.read`
Print client action calls the guarded server report mutation and then invokes
the browser print contract.

The mutation persists `survey_results_print_runs` through migration
`20260920170000-019-survey-results-print-runs.yaml`. It records the selected
completion/result cohort, actor, deterministic survey/response/question
counts, fixed generated-at, and row version. Missing survey, actor mismatch,
invalid filter, and replay/stale boundaries fail atomically. The migration
seed and file-backed reopen test make the report history durable and
replay-safe.

Focused CRUD/permission/restart coverage is in
`test/surveys_results_print.integration.test.ts`; the full Surveys suite and
repository regression results are recorded in `qa/surveys.md`. Authenticated
Core3 and reachable authenticated Odoo desktop/mobile captures, print
interception JSON, and the source comparison are under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-RESULTS-PRINT-001/`.
The disposable Odoo demo proxy at `127.0.0.1:8072` was connection-refused;
the reachable `127.0.0.1:8069` reference provided paired results/Print
captures. This is bounded evidence only: Surveys remains
**qa-in-progress / conditional**, with no full-module sign-off claimed.

## Bounded slice: Live-session attendee leaderboard (2026-09-20)

Feature ID: `SURVEYS-LIVE-LEADERBOARD-001`.

Odoo source comparison: `addons/survey/controllers/survey_session_manage.py`
defines the authenticated JSON-RPC
`/survey/session/leaderboard/<survey_token>` host endpoint, and
`addons/survey/models/survey_survey.py:967-1018` prepares a deterministic
score-descending leaderboard capped at 15 attendees. Core3 adds the
permissioned `survey_live_session_leaderboard` datasource to the existing
`survey-live-session-results` API/page pair and adds the host's
`show_live_session_leaderboard` action from the in-progress session manager.

The projection is scoped to the selected survey/session and only returns rows
while the session is `In Progress`; empty, transport, and closed-session
states are explicit. It reuses durable `survey_live_attendees` score/state
rows, so a file-backed DuckDB close, migration replay, and reopen retain the
same ordered positions. `surveys.read` protects the datasource and
`surveys.manage` protects host navigation.

Focused coverage is in `test/surveys_live_results.integration.test.ts` and
now includes the leaderboard contract, empty/closed states, and restart
durability. Authenticated Core3 desktop/mobile captures and the precise Odoo
empty-leaderboard fixture blocker are under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-LIVE-LEADERBOARD-001/`.
The Core3 shared runtime also exposed a concurrent non-Surveys schema error in
project/employees empty-state keys; the browser evidence used an isolated
Surveys runtime without editing those owners' files. Surveys remains
**qa-in-progress / conditional**; no full-module sign-off is claimed.

## Bounded slice: Public live-session access-code join (2026-09-20)

Feature ID: `SURVEYS-LIVE-SESSION-JOIN-001`.

Odoo source comparison: `addons/survey/controllers/survey_session_manage.py`
owns `/s`, `/s/<session_code>`, and
`/survey/check_session_code/<session_code>`. `_fetch_from_session_code`
rejects missing/certification surveys, admits only ready or in-progress
sessions, and returns the survey start URL for a valid code. Core3 mirrors the
public access-code seam with the separate `survey-live-session-join` page/API
pair and `handlePublicSessionRoute` in `services/surveys/module.ts`.

The durable mutation adds attendee token, join key, and row version columns in
`20260920200000-020-survey-live-session-join.yaml`. Ready sessions return a
Waiting attendee; In Progress sessions return the current question and an
In Progress attendee. Rejoining the same normalized name is idempotent and
returns the same durable token. Invalid, closed, and certification session
codes are rejected without disclosure. The DuckDB rollback path explicitly
tears down/recreates dependent indexes before removing the new columns.

Focused coverage is in `test/surveys_live_session_join.integration.test.ts`
and the migration rollback suite. Authenticated Core3 desktop/mobile and
authenticated Odoo desktop/mobile evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-LIVE-SESSION-JOIN-001/`.
Odoo returned `{\"error\":\"survey_wrong\"}` for code `5822`, so the paired
comparison is conditional on an installed/reference live session; attendee
answer submission remains a separate open gap. Surveys remains
**qa-in-progress / conditional** and this slice is not module sign-off.

## Bounded slice: Live-session attendee answer (2026-09-20)

Feature ID: `SURVEYS-LIVE-SESSION-ANSWER-001`.

The next smallest source-backed behavior after access-code join is the public
attendee answer write. Odoo's `survey_session_manage.py` admits the session
code, while `main.py`'s `/survey/submit/<survey_token>/<answer_token>` validates
the current question and saves a `survey.user_input.line`. Core3 mirrors that
workflow at `POST /api/public/surveys/session/<session_code>/answer`: the
attendee token must belong to the session, the session must be In Progress, and
the answer must be accepted by the current question. The layout remains in
`pages/live-session-join.yaml`; the permissioned server action and datasource
contract are in `api/live-session-join.yaml`, joined by
`page.id: survey-live-session-join`.

Migration `20260920220000-021-survey-live-session-answers.yaml` adds a unique
session/attendee/question index. The mutation durably inserts the answer,
updates deterministic score and session counters, and rejects empty, invalid,
closed, missing-attendee, and duplicate writes without disclosure or duplicate
rows. The route replays the committed current-question answer safely. The
file-backed DuckDB test proves the answer and replay boundary survive reopen
and migration replay.

Focused tests, QA inventory, source comparison, and authenticated Core3
desktop/mobile screenshots are under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-LIVE-SESSION-ANSWER-001/`.
Core3 browser evidence reports zero failed requests and no horizontal overflow
at 1440x900 and 390x844. Authenticated Odoo `/s/5822` renders the access-code
form, while `/survey/check_session_code/5822` returns HTTP 200 JSON-RPC
`{"error":"survey_wrong"}`; the reference has no matching live session, so
the Odoo attendee-answer comparison remains conditional. Surveys remains
**qa-in-progress / conditional** and this slice does not sign off the module.

## Bounded slice: Public retry lifecycle (2026-09-20)

Feature ID: `SURVEYS-PUBLIC-RETRY-001`.

The next smallest source-backed public behavior after attendee answers is
Odoo's `survey_retry` route in `addons/survey/controllers/main.py:167-191`.
After a valid completed attempt, Odoo creates a fresh answer while preserving
respondent/invite/test context and redirects to the survey start route with
the new answer token. Core3 adds the page-id-bound `public_survey_retry`
server action to `api/surveys.yaml` and handles
`POST /api/public/surveys/<survey_token>/retry` in `services/surveys/module.ts`.

The mutation requires a published target survey and a submitted source
response, resets answer data to `{}`, preserves respondent name/email and
test-entry state, and derives deterministic retry IDs/tokens from the source
attempt. An optional idempotency key returns the same retry row on replay.
The existing public progress/submit flow accepts the new token, and a
file-backed DuckDB reopen preserves it. The public submit handler also now
omits absent optional fields instead of binding `undefined` values, fixing a
retry continuation failure when a respondent submits without a name/email.

Focused CRUD/permission/guard/restart coverage is in
`test/surveys_public_retry.integration.test.ts`. Authenticated Core3
desktop/mobile evidence and exact authenticated Odoo evidence are under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-PUBLIC-RETRY-001/`.
The reachable Odoo `core3_reference` database has a valid completed Feedback
attempt, but the retry route returned HTTP 200 `Survey Access Error` with the
exact “Oopsie! We could not let you open this survey...” message. No paired
Odoo retry creation or redirect is claimed. Surveys remains
**qa-in-progress / conditional**.

## Bounded slice: Public response scoring (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-SCORING-001`.

Odoo source comparison: `addons/survey/models/survey_user_input.py` stores the
computed Score (%) and Quiz Passed result. Its scoring computation takes the
highest positive simple-choice score, sums positive multiple-choice scores,
and compares the percentage with `survey.scoring_success_min` (default 80%).
Core3 now applies the same suggested-answer scoring boundary on public submit,
persists `survey_responses.score` and `survey_responses.quiz_passed` through
migration `0.0.24`, and returns both fields through the token-scoped submit,
resume, and idempotency operations.

The public submit action remains in `api/surveys.yaml` with `surveys.public`,
while the `surveys` page fragment documents the paired renderer contract via
`page.id: surveys`. A losing concurrent DuckDB submit writer replays the
committed idempotency row instead of leaking a transaction conflict. Focused
coverage and evidence are under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-SCORING-001/`.

Authenticated Core3 desktop/mobile login succeeded, but the shared runtime
returned HTTP 404 `API route not found` for the authenticated public API and
HTTP 401 for the rendered public route. Odoo redirected the same public token
to `/web/login?redirect=%2Fodoo%3F`; no installed Survey participant/result
fixture was available. These are exact runtime/reference blockers, so no
browser or paired Odoo sign-off is claimed. Surveys remains
**qa-in-progress / conditional**.

## Bounded slice: Authenticated test-entry launch (2026-09-20)

Feature ID: `SURVEYS-TEST-ENTRY-001`.

The next shallow source-backed action after public retry is Odoo's
authenticated `/survey/test/<survey_token>` route in
`addons/survey/controllers/main.py:156-165`. Odoo creates a test answer and
redirects to the public survey start route with its answer token. Core3 now
hardens the existing `survey-test` page/API pair: `surveys.write` protects the
launch, the survey must be non-archived with a token and question graph, the
deterministic test-entry row and stable per-survey idempotency key are guarded,
and repeated launches reset the same durable row without duplicate entries.

The file-backed DuckDB test proves the test state and token survive reopen;
wrong launch keys, archived/no-question surveys, and missing test entries fail
atomically. Authenticated Core3 and Odoo desktop/mobile captures show the
corresponding Test Survey Entry landing state with no horizontal overflow.
Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-TEST-ENTRY-001/`.

This slice has a paired Odoo comparison. Surveys remains
**qa-in-progress / conditional** because broader module exit criteria remain
open; no full-module sign-off is claimed.

## Bounded slice: Public next-question navigation (2026-09-20)

Feature ID: `SURVEYS-PUBLIC-NEXT-QUESTION-001`.

The next source-backed public lifecycle is Odoo's
`/survey/next_question/<survey_token>/<answer_token>` controller in
`addons/survey/controllers/main.py:537-611`. It validates the active answer,
saves the current page, advances to the next ordered question, and renders the
next question or completion state. Core3 adds a durable public cursor and
navigation key through migration `20260920230000-022-survey-public-navigation.yaml`,
the `surveys.public.next_question` API action, and the corresponding
`POST /api/public/surveys/<survey_token>/next_question` route. The route is
token-scoped, `surveys.public` permissioned, stale-cursor guarded, ordered
question guarded, idempotent, and restart-safe.

Focused and full Surveys tests cover the YAML API/page ownership, wrong-token,
stale, closed, final-question, replay, migration rollback, and file-backed
restart boundaries. Core3 desktop/mobile API/page probes show HTTP 200
advancement to `question-feedback-comment`, zero failed requests, and no
horizontal overflow. The existing public page component still renders its
client-side question index after a reload because its source is outside the
Surveys-owned write boundary; this is recorded as a UI integration blocker,
not claimed as complete visual navigation. The Odoo live route comparison is
also conditional because the installed reference has no stable in-progress
answer-token fixture for this mutation route. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-PUBLIC-NEXT-QUESTION-001/`.

Surveys remains **qa-in-progress / conditional** and this slice does not sign
off the module.

## Bounded slice: Public previous-question navigation (2026-09-20)

Feature ID: `SURVEYS-PUBLIC-PREVIOUS-QUESTION-001`.

Odoo's `survey/submit` controller handles `previous_page_id` and returns the
prior ordered question/page (`addons/survey/controllers/main.py:583-587`).
Core3 now exposes the same bounded public transition through the separate
`surveys.public.previous_question` operation/API action and the Surveys-owned
`PublicSurvey` renderer binding. The transition is token-scoped,
`surveys.public` permissioned, stale-cursor and ordered-question guarded,
durable in `survey_responses.current_question_id`, restart-safe, and
idempotent by deterministic navigation key.

Focused integration coverage proves q2 → q1 navigation, replay, file-backed
DuckDB reopen, wrong-token, stale, closed, non-POST, and first-question
exhaustion boundaries. Authenticated Core3 desktop/mobile evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-PUBLIC-PREVIOUS-QUESTION-001/`.
The installed Odoo reference has no stable active answer-token fixture for a
fresh mutation probe, so paired Odoo mutation/visual sign-off remains blocked;
Surveys remains **qa-in-progress / conditional**.

## Bounded slice: Public response cookie resume (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-COOKIE-RESUME-001`.

Odoo source: `addons/survey/controllers/main.py:survey_start` reads the
`survey_<survey_token>` cookie when no explicit answer token is present,
ignores a wrong-user/deleted answer cookie, and sets a 24-hour cookie for the
resolved durable answer before redirecting to the survey page. Core3 now
implements that precedence and stale-cookie boundary in the public controller;
explicit tokens remain authoritative, while valid cookie responses resume
through GET and POST start. Cookie refreshes use `Path=/; HttpOnly;
SameSite=Lax; Max-Age=86400`.

The optional `answer_token` is declared in the separate `api/surveys.yaml`
public start action. The authenticated admin page remains in
`pages/surveys.yaml`; both fragments retain `page.id: surveys` and the public
renderer/controller binding is not duplicated in the admin layout.

Focused durable, permission/precedence, concurrency, and file-backed restart
coverage is in `test/surveys_public_cookie_resume.integration.test.ts`.
Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-COOKIE-RESUME-001/`.
The fresh Core3 runtime authenticated as Admin at desktop/mobile but returned
HTTP 404 `API route not found` for the authenticated public API and HTTP 401
for the anonymous request; this shared route-registry boundary was not edited.
Odoo returned HTTP 200 at both viewports but only its host-controlled Feedback
Form waiting state, with no mutable participant answer fixture. No visual or
paired Odoo sign-off is claimed. Surveys remains **qa-in-progress / conditional**.

## Bounded slice: Authenticated live-session previous question (2026-09-21)

Feature ID: `SURVEYS-LIVE-SESSION-PREVIOUS-001`.

Odoo's `survey_session_next_question` JSON-RPC controller accepts `go_back`
and uses the session question ordering to select the preceding question. Core3
adds the equivalent `previous_live_session_question` server action to the
existing `survey-live-session` API/page pair. The action is YAML-first and
separate from the page contract, permissioned with `surveys.manage`, guarded
by In Progress/current-question state and optimistic `row_version`, and
persists the prior question, text, deterministic start time, and incremented
version. A first-question attempt and stale replay are rejected atomically;
file-backed reopen restores the moved cursor.

Focused tests and evidence are under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-LIVE-SESSION-PREVIOUS-001/`.
The fresh Core3 browser probe reached the authenticated frontend but its
backend page registry returned `404 Unknown page: survey-live-session`; the
registry exposed only Blog pages, so no Core3 visual sign-off is claimed. The
Odoo `/s/5822` route returned HTTP 200, but its exact session-code JSON-RPC
check returned `{"error":"survey_wrong"}` because no matching live-session
fixture exists. No paired Odoo sign-off is claimed. Surveys remains
**qa-in-progress / conditional**.

## Bounded slice: Public answer validation (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-ANSWER-VALIDATION-001`.

Odoo's `/survey/submit/<survey_token>/<answer_token>` delegates submitted
values to each question's `validate_question` implementation. Core3 now keeps
the existing YAML page/API separation and validates token-scoped Choice,
Rating, Multiple Choice, and Numerical answers before either progress or
submit mutations. Invalid options return explicit
`SURVEY_PUBLIC_ANSWER_INVALID` 422 responses without changing the durable
response; valid answers continue through the existing idempotent submit and
file-backed restart workflow.

Focused tests, authenticated Core3 desktop/mobile evidence, and paired Odoo
route captures are under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-ANSWER-VALIDATION-001/`.
Odoo's authenticated route was reachable at both viewports, but remained on
the host-session waiting state, so no Odoo invalid-answer mutation comparison
is claimed. Surveys remains **qa-in-progress / conditional**.

## Bounded slice: Public live-session participant renderer (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-LIVE-SESSION-001`.

Odoo exposes the public live-session entry at `/s` and `/s/<session_code>`;
the source-side session helpers are listed in
`addons/survey/controllers/main.py` and the live-session join/answer APIs are
already represented by the Surveys page/API pair `survey-live-session-join`.
Core3 now binds that durable token-scoped contract to a public `/s` renderer:
participants can enter a code, join once, wait for the host, submit the
current question answer, refresh, and see the persisted answer after reload.
The renderer serializes join/answer submits and delegates permission, token,
state, answer-option, and duplicate guards to the YAML API mutations.

Focused coverage and authenticated Core3 desktop/mobile evidence are under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-LIVE-SESSION-001/`.
The disposable Odoo session reference at `127.0.0.1:8072` was unavailable
(`ERR_CONNECTION_REFUSED`) for both requested viewports, so no paired Odoo
visual sign-off is claimed. Surveys remains **qa-in-progress / conditional**.

## Bounded slice: Public next-question renderer binding (2026-09-20)

Feature ID: `SURVEYS-PUBLIC-NEXT-QUESTION-002`.

Ownership tracing showed that `public/app.ts` loads the Surveys-history
`public/components/PublicSurvey.ts` renderer for `/survey/start/...`. Core3
now binds that renderer to the durable `current_question_id` cursor and
`POST /api/public/surveys/<token>/next_question`: it saves progress, sends the
expected question plus deterministic navigation key, renders the server-
returned next question, and restores that question after reload. The Next
button is serialized while the transition is in flight, and local back-
navigation cannot issue an invalid stale transition.

Focused contract/API coverage and authenticated Core3 desktop/mobile evidence
are recorded under
`plan/odoo-ui-parity/evidence/surveys/2026-09-20/SURVEYS-PUBLIC-NEXT-QUESTION-002/`.
The installed Odoo reference still lacks a stable active answer-token fixture
for a paired mutation probe, so no Odoo sign-off is claimed. Surveys remains
**qa-in-progress / conditional**.

## Bounded slice: Public response deadline (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-DEADLINE-001`.

Odoo source comparison: `addons/survey/controllers/main.py` checks the answer
deadline in `_check_validity` before allowing public start, navigation, submit,
or retry and returns the `answer_deadline` error state. Core3 adds durable
`survey_responses.deadline` storage in migration `0.0.23`, exposes the deadline
through public response operations, and keeps the token-scoped public API
actions permissioned as `surveys.public`. Expired responses return HTTP 410
with `SURVEY_PUBLIC_RESPONSE_EXPIRED` before any answer, cursor, response-count,
or retry-row mutation; active responses remain editable and preserve the
deadline through file-backed DuckDB reopen.

The dynamic public page remains the Surveys-owned `PublicSurvey` binding while
the mutation contracts remain in the separate `api/surveys.yaml` fragment.
Focused coverage and precise evidence are under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-DEADLINE-001/`.

The authenticated desktop/mobile browser probe was blocked before readiness by
the shared source runtime's exact discovery error
`PageSchemaError: actions[4].fields is not allowed`; no Core3 visual or Odoo
deadline sign-off is claimed. Surveys remains **qa-in-progress / conditional**.

## Bounded slice: Public begin transition (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-BEGIN-001`.

Odoo source comparison: `addons/survey/controllers/main.py:survey_begin`
transitions a valid existing public answer from `New` to `In Progress` and
prepares the first ordered question. Core3 now exposes that transition as the
separate `public_survey_begin` API action and updates the durable response
cursor through the existing `/survey/start/<survey>/<answer>` page route.
The mutation is token-scoped, permissioned as `surveys.public`, rejects
expired or already-started responses, and retries a losing concurrent writer
as an idempotent replay.

Focused contract, concurrency, and file-backed restart coverage is recorded in
`test/surveys_public_begin.integration.test.ts`; evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-BEGIN-001/`.
Core3 authenticated browser/API verification is blocked by the shared runtime
returning HTTP 401 for the public page and HTTP 404 `API route not found` after
authenticated direct calls because the Surveys route is not registered in that
runtime. Odoo 8069 reaches the host-controlled Feedback Form waiting state;
the disposable 8072 reference is unavailable. No visual or Odoo begin
sign-off is claimed. Surveys remains **qa-in-progress / conditional**.

## Bounded slice: Public section boundary (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-SECTIONS-001`.

Odoo keeps `is_page` section rows in the survey question graph but does not
present them as answerable public questions. Core3 now excludes section rows
from the public question catalog and from first/current/next/previous durable
cursor resolution. The existing `surveys` page/API pair remains joined by
`page.id`, public actions remain permissioned as `surveys.public`, and a
concurrent next-question loser replays the committed navigation key.

Focused persistence, concurrency, guard, and restart coverage is recorded in
`test/surveys_public_sections.integration.test.ts`; evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-SECTIONS-001/`.
The fresh Core3 conditional-fixture probe rendered `API route not found` at
both authenticated viewports because the shared runtime did not register the
Surveys public route. Odoo redirected the unavailable synthetic token to its
login page. No browser or paired Odoo sign-off is claimed. Surveys remains
**qa-in-progress / conditional**.

## Bounded slice: Public completion message (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-END-MESSAGE-001`.

Odoo's `survey.survey.description_done` is the configured End Message shown
when a public response reaches the completed state. Core3 now adds the
durable `surveys.description_done` field through migration `0.0.25`, seeds a
deterministic Feedback Form completion message, returns it through the
token-scoped public detail operation, and has the Surveys-owned public
renderer consume it on submit and submitted-response resume.

The public API remains separate from the `surveys` page layout and is joined
through `page.id: surveys`; submit remains permissioned as `surveys.public`.
Focused coverage verifies the API/page/renderer contract, concurrent
idempotent submit, wrong-token rejection, and file-backed restart. Evidence is
under `plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-END-MESSAGE-001/`.

Authenticated Core3 login and `/api/auth/me` succeeded at desktop and mobile,
but the shared runtime returned HTTP 404 `API route not found` for the
authenticated public API and HTTP 401 for the rendered public route. Odoo
redirected the public token to `/web/login?redirect=%2Fodoo%3F` at both
viewports, leaving no installed Survey completion fixture. No browser or
paired Odoo sign-off is claimed; Surveys remains **qa-in-progress / conditional**.

## Bounded slice: Public Date question (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-DATE-QUESTION-001`.

Odoo's `survey.question.validate_question` dispatches `date` and `datetime`
questions to `_validate_date`, which parses the submitted value before the
response is accepted. Core3 implements the narrower `Date` variant: the
deterministic certification fixture now includes an optional Date question,
the public renderer uses a custom ISO `YYYY-MM-DD` text control, and the
token-scoped public progress/submit workflow rejects impossible or malformed
dates before mutating `survey_responses.answer_data`. The existing `surveys`
page and `api/surveys.yaml` remain separate and joined through `page.id:
surveys`; both public mutations retain `surveys.public`.

Focused persistence, permission, invalid-input, concurrency/idempotency, and
file-backed restart coverage is recorded in
`test/surveys_public_date_question.integration.test.ts`; evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-DATE-QUESTION-001/`.
Core3 authenticated login and `/api/auth/me` succeeded at desktop/mobile, but
the shared frontend registry returned HTTP 404 `API route not found` for the
authenticated public API and HTTP 200 `Unauthorized` for the rendered route.
Odoo 8069 redirected the public token to
`/web/login?redirect=%2Fodoo%3F` at both viewports, so no installed authenticated
Survey Date fixture was available. No browser or paired Odoo sign-off is
claimed; Surveys remains **qa-in-progress / conditional**.

## Bounded slice: Public Scale question (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-SCALE-QUESTION-001`.

Odoo's `survey.question._validate_scale` handles Scale answers against the
question's configured range; the Odoo form exposes minimum/maximum values and
labels for the control. Core3 implements the smallest public equivalent: the
deterministic certification fixture adds an optional Scale question with the
source default 0–10 range encoded in durable `answer_options`, the public
renderer presents radio choices, and token-scoped progress/submit rejects
out-of-range values before mutating `survey_responses.answer_data`. The page
and API YAML remain separate and joined through `page.id: surveys`, with
`surveys.public` on both mutations.

Focused permission, invalid-input, concurrency/idempotency, and file-backed
restart coverage is recorded in
`test/surveys_public_scale_question.integration.test.ts`; evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-SCALE-QUESTION-001/`.
The fresh Core3 process was blocked by the shared page-schema error
`components[0].search.categories is not allowed` / `components[0].search.or locations... is not allowed`;
both viewport navigations were refused. Odoo 8069 redirected the public token
to `/web/login?redirect=%2Fodoo%3F` at both viewports. No browser or paired
Odoo sign-off is claimed; Surveys remains **qa-in-progress / conditional**.

## Bounded slice: Public Datetime question (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-DATETIME-QUESTION-001`.

Odoo's `survey.question.validate_question` dispatches `datetime` questions to
`_validate_date`, using `fields.Datetime.from_string` and optional range
checks. Core3 implements the distinct `Datetime` variant: the deterministic
certification fixture includes an optional Datetime question, the public
renderer uses a custom `YYYY-MM-DD HH:MM:SS` text control, and the token-scoped
public progress/submit workflow rejects impossible or malformed timestamps
before mutating `survey_responses.answer_data`. The page and API YAML remain
separate and joined through `page.id: surveys`, with `surveys.public` on both
public mutations.

Focused invalid-input, permission, concurrency/idempotency, and file-backed
restart coverage is recorded in
`test/surveys_public_datetime_question.integration.test.ts`; evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-DATETIME-QUESTION-001/`.
Fresh authenticated Core3 login and `/api/auth/me` succeeded at desktop/mobile,
but the shared registry returned HTTP 404 `API route not found` for the public
API and HTTP 200 `Unauthorized` for the rendered route. Odoo 8069 redirected
the token to `/web/login?redirect=%2Fodoo%3F` at both viewports. No browser or
paired Odoo sign-off is claimed; Surveys remains **qa-in-progress / conditional**.

## Bounded slice: Public Matrix question (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-MATRIX-QUESTION-001`.

Odoo's `survey.question` model treats Matrix as a distinct question type with
separate suggested-answer columns and matrix rows. The public controller
accepts a row-keyed mapping of selected columns, while `_validate_matrix`
enforces complete row coverage only when the question is mandatory;
`_save_line_matrix` persists each row/column selection. The source demo in
`addons/survey/data/survey_demo_feedback.xml` uses five rows, four columns,
and multiple selections per row.

Core3 adds migration `0.0.29` with deterministic row/column labels on an
optional certification Matrix question. Public question operations project
the metadata through the separate `page.id: surveys` page/API pair;
`PublicSurvey.ts` renders the table and collects a row-to-column JSON map. The
token-scoped `surveys.public.progress` and `surveys.public.submit` paths reject
foreign rows, foreign columns, duplicate cells, and malformed values before
mutation; required Matrix questions also enforce complete row coverage.

`test/surveys_public_matrix_question.integration.test.ts` proves the paired
contract, invalid-cell no-mutation boundary, file-backed restart, wrong-token
denial, and concurrent idempotent submit. Focused verification is **2/2 tests,
22 assertions**; the public regression is **42/42 tests, 353 assertions**.
Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-MATRIX-QUESTION-001/`.

The Core3 browser process did not expose its backend during the bounded
readiness window, so both viewport probes record connection refusal. Odoo 8069
redirected both viewport probes to its login form and supplied no authenticated
Matrix response. The existing DuckDB rollback/dependent-entry failure remains
open. No browser, paired Odoo, or module sign-off is claimed; Surveys remains
**qa-in-progress / conditional**.

## Bounded slice: Public conditional question (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-CONDITIONAL-QUESTION-001`.

Odoo's `survey.question.triggering_answer_ids` and the conditional demo in
`addons/survey/data/survey_demo_conditional.xml` make a follow-up question
visible only when a source answer is selected. Core3 now has the durable
`survey_question_triggers` relation and a deterministic published
`SURVEY/BRANCHING` fixture. Public GET/progress/submit filters by the stored
answer, next/previous navigation skips hidden rows in both directions, and
the renderer merges a conditional question returned by the API into its local
sorted set. This closes the page/API integration gap rather than exposing a
disconnected action.

The page and API YAML remain separate and join through `page.id: surveys`;
public actions retain `surveys.public`. Focused coverage proves permission and
wrong-token boundaries, no-mutation invalid paths, concurrent idempotent
submit, and file-backed restart. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-CONDITIONAL-QUESTION-001/`.

Focused verification is **2 passed / 25 assertions** and the public regression
is **44 passed / 376 assertions**. The complete migration rollback gate still
fails on the known DuckDB dependent-entry error; the repository audit is
blocked by a concurrent non-Surveys page-schema error. Fresh Core3 desktop and
mobile runtime probes returned a bounded 502 because the backend did not
become ready, and Odoo redirected through `/`, `/odoo`, and
`/web/login?redirect=%2Fodoo%3F` without an installed authenticated Survey
fixture. No browser, paired Odoo, or module sign-off is claimed; Surveys
remains **qa-in-progress / conditional**.

## Bounded slice: Public choice comments (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-COMMENTS-001`.

Odoo's `survey.question` supports `comments_allowed`, a source-defined prompt,
and `comment_count_as_answer` for choice questions. Core3 now adds those
durable question settings through migration `0.0.31`, seeds the published
`SURVEY/COMMENTS` fixture, exposes settings through a separate API operation,
and renders/persists the comment as a question-scoped answer-data entry. A
configured non-empty comment can satisfy a required Choice; a comment attached
to a question that does not allow comments is rejected before mutation.

The page and API YAML remain separate and joined by `page.id: surveys`; public
actions retain `surveys.public`. Focused coverage proves comment-only required
completion, restart persistence, concurrent idempotent submit, wrong-token
denial, and the disallowed-comment no-mutation boundary. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-COMMENTS-001/`.

Focused verification is **2 passed / 21 assertions** and the public regression
is **46 passed / 399 assertions**. ESLint, audit, and scoped diff-check pass.
The migration rollback gate still reports DuckDB dependent entries. Fresh
Core3 desktop/mobile probes returned a bounded 502 because the backend did not
expose `/api/modules`; Odoo redirected to `/web/login?redirect=%2Fodoo%3F`
without an installed authenticated Survey fixture. No browser, paired Odoo,
or module sign-off is claimed; Surveys remains **qa-in-progress / conditional**.

## Bounded slice: Public respondent identity capture (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-IDENTITY-001`.

Odoo's `survey.question` stores `save_as_email` and `save_as_nickname` for
char-box questions, and `survey.user_input._save_lines` writes a configured
answer to the durable participant email or nickname while retaining the answer
line. Core3 implements the smallest corresponding public slice with migration
`20260929000000-032-survey-public-identity.yaml`, the published deterministic
`Contact Details` survey, and the separate `survey.public.identity_settings`
operation. The existing `page.id: surveys` API/page pair carries the flags;
progress and submit remain token-scoped `surveys.public` actions, derive the
identity fields, and preserve `answer_data`. The renderer presents email and
nickname autocomplete controls rather than a disconnected API.

Focused coverage proves YAML wiring, token guards, durable progress, restart,
spoof-resistant derived identity, and concurrent idempotent submit. Evidence
is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-IDENTITY-001/`.

Focused verification is **2 passed / 19 assertions** and the public regression
is **71 passed / 638 assertions**. The broader Surveys run reproduces the four
known DuckDB rollback/dependent-entry failures and was stopped after bounded
reproduction; no full-repository pass is claimed. Authenticated Core3 desktop
and mobile probes passed with no request/page failures or horizontal overflow.
Odoo 8069 redirected both viewports to its login route and disposable proxy
8072 refused the connection, so no paired Odoo identity fixture or visual
sign-off is claimed. Surveys remains **qa-in-progress / conditional**.

## Bounded slice: Public survey background delivery (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-BACKGROUND-001`.

Odoo computes a token-scoped `background_image_url`, serves the corresponding
public image through `/survey/<survey_token>/get_background_image`, and applies
it to the survey wrapper. Core3 implements this one behavior with migration
`20260930000000-033-survey-public-background.yaml`, which persists a deterministic
published fixture URL and SVG content. The paired `page.id: surveys` API/page
contract declares a `surveys.public` asset action, the module guards published
survey tokens and methods, and the public renderer applies only the validated
same-origin background URL.

Focused verification is **2 passed / 23 assertions**. The module regression is
**107 passed / 5 failed / 898 assertions** with only the known rollback
dependent-entry failures and stale Test Entry fixture expectation failing.
Audit, scoped lint, and diff-check pass. Authenticated Core3 desktop/mobile
captures show HTTP 200 SVG delivery and computed background at 1440x900 and
390x844 with no overflow or browser failures. Odoo desktop/mobile redirected
to login, credentials were rejected, and port 8072 refused; no paired Odoo
sign-off is claimed. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-BACKGROUND-001/`.

## Bounded slice: Public suggested-answer image delivery (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-QUESTION-IMAGE-001`.

Odoo's `survey_get_question_image` route validates the public answer context,
question ownership, and suggested-answer ownership before streaming
`value_image`. Core3 migration `20261002000000-035-survey-public-question-images.yaml`
adds durable image content and a separate published `Image Choice Survey`.
The `survey.public.question_image` operation and `surveys.public` API action
serve the token-scoped SVG; the public Choice renderer displays the image using
the returned image-answer metadata. The authenticated page/API remain separate
through `page.id: surveys`.

Focused image/background checks are **4 passed / 44 assertions**; the focused
integration trio is **27 passed / 264 assertions**; the public/core Surveys
regression is **75 passed / 682 assertions**. Scoped lint, diff-check, and the
repository UI audit pass (716 pages, 725 routes, 1370 datasources).
Authenticated Core3 desktop/mobile probes render the image at 1440x900 and
390x844 with HTTP 200 SVG delivery, no request/page failures, and no horizontal
overflow. Odoo desktop and mobile redirect to login and port 8072 refuses; no
paired Odoo fixture or parity sign-off is claimed. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-QUESTION-IMAGE-001/`.

## Bounded slice: Public Numerical question validation (2026-09-21)

Feature ID: `SURVEYS-PUBLIC-NUMERICAL-QUESTION-001`.

Odoo's `survey.question._validate_numerical_box` rejects malformed values and,
when validation is enabled, values outside the inclusive persisted minimum and
maximum. Core3 migration `20261003000000-036-survey-public-numerical-question.yaml`
adds those durable fields and seeds a separate published `Numerical Range
Survey` with a 1.5–10.5 minute range and deterministic validation message.
The paired `page.id: surveys` API/page contract projects the fields through
`survey.public.questions`; token-scoped `surveys.public` progress and submit
reject invalid values before mutating `answer_data`. The public renderer binds
the same metadata to a numeric control and client-side guard.

Focused verification is **2 passed / 26 assertions**; the public/core Surveys
regression is **77 passed / 708 assertions**. The source-served Core3
authenticated admin/public desktop and mobile probes passed with no page or
request failures and no horizontal overflow; the desktop exploratory `11.1`
submission displayed the durable validation message. Audit, scoped lint, and
diff-check pass. Odoo desktop/mobile redirect to
`/web/login?redirect=%2Fodoo%2Fsurveys%3F`, while port 8072 is unavailable, so
no paired Odoo fixture or parity sign-off is claimed. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-NUMERICAL-QUESTION-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-CHAR-QUESTION-001`

Selected the next uncovered source-backed public question behavior after the
completed numerical validation slice: Odoo Char/Char Box email and inclusive
length validation. Odoo `survey.question._validate_char_box` uses durable
`validation_email`, `validation_length_min`, and `validation_length_max` flags
plus the persisted validation message. Migration `0.0.37` adds those fields and
seeds a separate published `Contact Email Survey` fixture.

The existing paired `page.id: surveys` API/page contract projects the metadata
through `survey.public.questions`; token-scoped `surveys.public` progress and
submit reject malformed email and out-of-range length before mutation. The
renderer presents an email input with `minlength`/`maxlength` attributes and
the same validation copy. Focused coverage passes **2/2 with 26 assertions**;
the public/core Surveys regression passes **79/79 with 733 assertions**. Audit
passes with **718 pages, 727 routes, and 1379 datasources**; scoped ESLint and
diff-check pass.

Authenticated Core3 admin/public desktop/mobile probes pass at 1440x900 and
390x844 with no request/page failures or horizontal overflow. Odoo desktop and
mobile both redirect to
`/web/login?redirect=%2Fodoo%2Fsurveys%3F`; port 8072 is unavailable, so no
authenticated Odoo fixture or parity sign-off is claimed. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-CHAR-QUESTION-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-TEXT-QUESTION-001`

Selected the next uncovered source-backed public question behavior after the
completed Char slice: Odoo `text_box` multi-line free text. Odoo declares the
type as “Multiple Lines Text Box”, renders a three-row textarea, stores the
answer in `value_text_box`, and applies the mandatory answer guard before
submission. Core3 migration `0.0.38` seeds a separate published Product
Feedback Survey with a required Core3 `Text` question.

The paired `page.id: surveys` API/page contract preserves `surveys.public`;
the renderer binds `Text`/`Text Box` to a textarea and the module rejects
array-shaped values before progress/submit. Focused coverage passes **2/2 with
23 assertions**; the public/core Surveys regression passes **81/81 with 756
assertions**. Audit passes with **718 pages, 727 routes, and 1382 datasources**;
scoped ESLint and diff-check pass.

The custom module's delegate runtime binding was repaired and its authenticated
page API returned 200. The isolated browser topology then reported
`Service host unavailable`, while anonymous public API access returned 401, so
Core3 desktop/mobile visual sign-off is conditional. Odoo redirects both
viewports to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; port 8072 is unavailable.
No Odoo fixture or parity sign-off is claimed. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-TEXT-QUESTION-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-MULTIPLE-CHOICE-001`

Selected the next uncovered source-backed public question behavior after the
completed Text slice: Odoo `multiple_choice` multi-select answers. Odoo
normalizes a scalar or list payload into choice lines and replaces the prior
choice set; Core3 migration `0.0.39` seeds a separate published Product
Preferences Survey with a required `Multiple Choice` question.

The paired `page.id: surveys` API/page contract retains `surveys.public`; the
existing renderer binds the question to checkbox controls, while token-scoped
progress/submit reject foreign and duplicate options before mutation. Focused
coverage proves required completion, durable multi-selection across restart,
concurrent idempotent submit, response-count integrity, and wrong-token denial.

Focused verification is **2 passed / 24 assertions**; the public/core Surveys
regression is **83 passed / 780 assertions** across 27 files. Audit passes with
**719 pages, 728 routes, and 1391 datasources**; scoped lint and diff-check
pass. Core3 desktop/mobile
browser probes were attempted but the isolated runtime returned connection
refused before rendering. Odoo desktop/mobile reached only the login shell and
port 8072 refused; no Core3 visual or paired Odoo sign-off is claimed. Evidence
is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-MULTIPLE-CHOICE-001/`.

## 2026-09-21 — `SURVEYS-LIVE-QUESTION-TIMER-001`

Selected one genuinely uncovered source-backed live-session behavior after the
completed public question slices: Odoo's per-question live-session timer.
Odoo stores `is_time_limited` and `time_limit` on the question, records the
host's question start timestamp, renders an attendee countdown, and rejects a
late answer before mutation. Core3 migration `0.0.40` adds those durable
fields and an isolated timer survey/session fixture.

The paired `survey-live-session-join` page/API contract returns the durable
timestamp and limit. `PublicLiveSession.ts` renders the countdown and disables
the submit button at the client deadline, while the YAML mutation repeats the
expiry check with `SURVEY_SESSION_QUESTION_TIME_EXPIRED` after public session
and attendee-token guards. Focused timer/live-answer verification passes **4
tests / 45 assertions**, including late no-mutation, valid persistence,
file-backed restart, and idempotent replay. The Surveys glob is **120 passed /
4 failed / 1041 assertions**; the four failures are the existing DuckDB
rollback/dependent-entry limitation.

Audit passes with **721 pages, 730 routes, and 1396 datasources**; scoped
ESLint and diff-check pass. Core3 desktop/mobile probes at 1440x900 and
390x844 hit `ERR_CONNECTION_REFUSED` on port 3000. Odoo desktop/mobile at
8069 reached only the login shell and port 8072 refused, so no authenticated
Odoo timer comparison or parity sign-off is claimed. Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-LIVE-QUESTION-TIMER-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-SURVEY-TIMER-001`

Wave 20 selects one uncovered source-backed behavior after the completed
public question slices and live question timer: Odoo's survey-level elapsed
time limit. Odoo stores `survey.is_time_limited` and `survey.time_limit`, starts
the attempt `start_datetime` when it enters progress, exposes timer data to the
public form, and blocks navigation/submission after the survey limit. This is
separate from Core3's response `deadline` and the existing live-session
per-question timer.

Core3 migration `0.0.41` adds durable `surveys.is_time_limited`/
`time_limit` and `survey_responses.start_datetime`, with a fixed published
one-minute fixture. The page/API YAML remains separated through `page.id:
surveys`; public detail/response operations project the timer fields, the
renderer shows a countdown, and `services/surveys/module.ts` applies the
authoritative token-scoped expiry guard before reads or mutations.

Focused verification passes **9/9 tests with 99 assertions** across the timer,
deadline, response, and restart suites. The full Surveys glob passes **122
tests / 1,065 assertions** with **4 existing migration rollback/dependent-entry
failures**. Audit passes at **722 pages, 731 routes, and 1,400 datasources**;
scoped ESLint and `git diff --check` pass. Core3 desktop/mobile probes were
blocked before render because ports 3000/3001/3002 refused connections. Odoo
8069 redirected to login and the Surveys addon is uninstalled; proxy 8072 was
unavailable. No visual/reference sign-off is claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-SURVEY-TIMER-001/`.

## 2026-09-21 — `SURVEYS-QUESTION-DUPLICATE-001`

Wave 21 selects one genuinely uncovered question workflow after the completed
public/live timer and question-type slices: Odoo question duplication. Odoo's
`survey.question.copy()` delegates to ORM copy and preserves triggering-answer
relationships (`addons/survey/models/survey_question.py:420-425`); the question
form disables create while retaining duplication as an action.

Core3 adds a permissioned Duplicate entry to the question-detail Actions menu.
The separate API YAML copies the durable question and its suggested-value
relations atomically, increments the parent survey `row_version`, rejects
missing/archived/stale/duplicate requests, and navigates to the copied
question. Focused coverage proves the page/API join, persistence, permission
boundary, parent concurrency guard, file-backed restart, and replay without a
second row.

Focused verification is **3 passed / 21 assertions**. The bounded Surveys
regression is **125 passed / 4 failed / 1,086 assertions** across 129 tests;
the four failures are the known migration rollback/dependent-entry failures;
no other module files were changed. The UI audit passes with **723 pages, 732
routes, and 1,402 datasources**. Core3 ports 3000/3001/3002 refused before an
authenticated desktop/mobile render. Odoo `/odoo/surveys` redirected both
viewports to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`, and proxy 8072 refused,
so no reference form or parity sign-off is claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-QUESTION-DUPLICATE-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-ATTEMPT-LIMIT-001`

Wave 22 selects one genuinely uncovered source-backed public behavior after
question duplication: Odoo's per-respondent attempt limit. Odoo stores
`users_login_required`, `is_attempts_limited`, and `attempts_limit`; it counts
completed non-test attempts by respondent identity when creating an answer and
rechecks the limit at submit (`survey_survey.py:117-119,535-619,667-693` and
`controllers/main.py:541-543`). Anonymous public surveys remain unlimited
unless login is required.

Core3 migration `0.0.42` adds the durable access/limit fields and a deterministic
published one-attempt fixture. The paired public API/page contract exposes the
metadata, the renderer collects respondent email, and authoritative start,
retry, and submit guards enforce normalized email-scoped completed-attempt
counts. File-backed restart and concurrent idempotent start are covered.

Focused verification is **3 passed / 30 assertions**; the related public
attempt/retry suite is **6 passed / 54 assertions**. The full Surveys glob is
**128 passed / 4 failed / 1,116 assertions** across 132 tests; the four known
failures are DuckDB migration rollback/dependent-entry failures. Audit passes
with **725 pages, 734 routes, and 1,407 datasources**; scoped lint and
diff-check pass. Core3 ports 3000/3001/3002 refused before authenticated
desktop/mobile render. Odoo redirected both viewports to
`/web/login?redirect=%2Fodoo%2Fsurveys%3F`, and proxy 8072 refused, so no
reference comparison or parity sign-off is claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-ATTEMPT-LIMIT-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-BACK-GUARD-001`

Wave 23 selects the next uncovered Odoo public workflow setting after attempt
limits: `users_can_go_back`. Odoo stores this boolean on `survey.survey` and
computes `can_go_back` from it, the response state, layout, and current cursor
(`survey_survey.py:98,647-664`; `controllers/main.py:359,363`).

Core3 migration `0.0.43` adds the durable setting and a deterministic published
two-question `No Back Customer Survey` with the option disabled. Existing
fixtures retain their previous back-enabled behavior explicitly. The paired
`pages/surveys.yaml` / `api/surveys.yaml` contract and survey detail fields
expose the setting; the public renderer omits Back when disabled and the
`surveys.public.previous_question` mutation rejects direct bypasses with
`SURVEY_PUBLIC_PREVIOUS_DISABLED`. Concurrent allowed Previous requests retry
and replay the durable navigation key after a transient DuckDB conflict.

Focused verification is **6 passed / 41 assertions** and the public/catalog
regression is **91 passed / 857 assertions** across 30 files. The full Surveys
glob is **131 passed / 4 failed / 1,139 assertions** across 135 tests; the four
failures are the existing DuckDB migration rollback/dependent-entry errors.
Audit passes with **726 pages, 735 routes, and 1,409 datasources**; scoped lint
and diff-check pass. Core3 ports 3000/3001/3002 refused; Odoo 8069 redirected
to login and proxy 8072 refused. No authenticated visual or Odoo parity
sign-off is claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-BACK-GUARD-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-TOKEN-ACCESS-001`

Wave 24 selects the next uncovered public access behavior after the completed
back-navigation and attempt-limit settings: Odoo's `access_mode='token'`
boundary. Odoo's public controller refuses `survey/start/<survey_token>`
without an existing `survey.user_input.access_token`, and scopes that answer
token to the survey (`addons/survey/controllers/main.py:25-75`).

Core3 migration `0.0.44` adds a deterministic published invitation-only
survey plus a pre-created `New` answer row. The new `survey.public.access`
operation scopes `token-access-answer-2026` to the survey token; the route
rejects missing/wrong answer tokens before returning questions or starting the
response. The paired `pages/surveys.yaml` / `api/surveys.yaml` contract keeps
`page.id: surveys`, `surveys.public`, and the YAML start guard explicit. A
concurrent start converges on the same durable answer and a file-backed reopen
resumes its `In Progress` state.

Focused verification is **3 passed / 25 assertions**; the public/catalog
regression is **94 passed / 882 assertions across 31 files**. Audit passes at
**727 pages, 736 routes, and 1,413 datasources**; scoped ESLint and
`git diff --check` pass. Core3 screenshots at 1440x1000 and 390x844 are
captured, but the bounded runtime returned 401 Unauthorized before the public
API loaded. Odoo 8069 redirected the synthetic route to `/`, proxy 8072
refused, and no authenticated installed Surveys fixture was available. No
visual or module sign-off is claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-TOKEN-ACCESS-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-ONE-PAGE-001`

Wave 25 selects Odoo's next uncovered public pagination behavior: the durable
`questions_layout='one_page'` mode from `survey_survey.py:75-79`. Odoo's public
controller switches from a question cursor to a page payload and marks a
one-page response done on the all-question submit
(`controllers/main.py:278-298,337-363,581-582`).

Core3 migration `0.0.45` adds `surveys.questions_layout`, normalizes existing
rows to the source default, and seeds a deterministic two-question one-page
survey. The paired `pages/surveys.yaml` / `api/surveys.yaml` contract and
`survey.public.detail` project the setting. `PublicSurvey.ts` now consumes the
setting, renders all visible questions together, and submits one token-scoped
answer object; the existing page-per-question cursor remains unchanged.

Focused verification is **3 passed / 21 assertions**. The public/catalog
regression is **97 passed / 903 assertions** across 32 files. UI audit passes
with **729 pages, 738 routes, and 1,419 datasources**; scoped ESLint and
`git diff --check` pass. Core3 ports 3000/3001/3002 refused before an
authenticated desktop/mobile render. Odoo 8069 redirected both viewport
probes to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`, and proxy 8072 refused;
no installed authenticated Surveys fixture or visual comparison was
available. No parity sign-off is claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-ONE-PAGE-001/`.

## 2026-09-21 — `SURVEYS-PUBLIC-PROGRESSION-MODE-001`

Wave 26 selects Odoo's next uncovered public survey setting: durable
`progression_mode` (`percent` or `number`) from `survey_survey.py:85-88`.
Odoo's public template renders the selected percentage or answered/page count
at `survey_templates.xml:691-704`, with the controller supplying the active
page list and cursor at `controllers/main.py:386-400`.

Core3 migration `0.0.46` adds and normalizes `surveys.progression_mode`, then
seeds a deterministic numbered two-question public survey. The paired
`pages/surveys.yaml` / `api/surveys.yaml` contract and `survey.public.detail`
project the setting. `PublicSurvey.ts` consumes it for page-per-question
progress text while preserving one-page behavior and all existing public
token/state/idempotency guards.

Focused verification is **3 passed / 18 assertions**. The public/catalog
regression is **100 passed / 921 assertions** across 33 files. UI audit passes
with **731 pages, 740 routes, and 1,424 datasources**; scoped ESLint and
`git diff --check` pass. Core3 ports 3000/3001/3002 refused before an
authenticated desktop/mobile render. Odoo 8069 redirected both viewport
probes to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`, and proxy 8072 refused;
no installed authenticated Surveys fixture or visual comparison was
available. No parity sign-off is claimed.

Evidence is under
`plan/odoo-ui-parity/evidence/surveys/2026-09-21/SURVEYS-PUBLIC-PROGRESSION-MODE-001/`.
