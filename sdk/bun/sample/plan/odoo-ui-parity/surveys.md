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
