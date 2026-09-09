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

## Source menu, action, view, and route inventory

The source menu tree in `views/survey_menus.xml` and the action/menu additions
in the other view files are:

| Visible menu/action | Source id/model | View modes or contract | Planned Core3 route |
| --- | --- | --- | --- |
| Surveys > Surveys | `action_survey_form` / `survey.survey` | `kanban,list,form,activity`; source also defines graph and pivot views for the model | `/surveys` |
| Surveys > Participants | `action_survey_user_input` / `survey.user_input` | `list,kanban,form`; default group by Survey; create disabled | `/surveys/participants` (route to be confirmed from installed Odoo) |
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
