# Odoo 19 UI parity — Recruitment

Status: `batch-8-implemented-visual-capture-blocked`

## Batch 9 — Applications → Next Activities

Source trace: Odoo 19 `addons/hr_recruitment/views/hr_applicant_views.xml`
defines `hr_applicant_view_tree_activity` for the All Applications action
(`crm_case_categ0_act_job`). The view is titled `Next Activities`, orders by
`activity_date_deadline`, and displays Applicant, Activity Deadline, Activity
Type, Summary, Stage, and the activity exception decoration. The parent action
exposes this applicant view alongside kanban, list, form, pivot, graph,
calendar, and activity modes. Applicant read access is granted to recruitment
users and interviewers; Core3 keeps this visible slice behind
`recruitment.read`, while activity mutations remain outside this bounded batch.

Core3 extends the page-id-joined `applicants` API datasource with deterministic
activity fields and adds an `activity` view labeled `Next Activities`. Its
cards show the deadline, summary, stage, assignee, and overdue status, with
Email, Interview, and Call activity types. Migration
`20260912120000-012-recruitment-applicant-activities.yaml` adds the service-owned
columns and seeds fixed 2026-01-12, 2026-01-15, and 2026-01-20 deadlines for
overdue, today, and upcoming examples. Null activity deadlines remain absent
from the activity surface. Loading, empty, search, and transport-error
handling continue through the existing page datasource contract; the focused
test proves deterministic ordering, overdue filtering, search, and no-match
empty results.

Focused verification:

- `bun test test/recruitment_applicant_activities.integration.test.ts` — 2
  passed, 0 failed, 8 assertions.
- `bun run audit` — passed: 633 pages, 649 routes, 1086 datasources.
- Authenticated desktop/mobile visual capture is blocked. The required Core3
  start attempt at the exact 1440x900 and 390x844 targets cannot reach an
  authenticated page because Vite exits with `EMFILE: too many open files`
  while watching `vite.config.ts`; no visual-parity claim is made and no
  screenshots are committed. Odoo remains unverified in this run because the
  browser session cannot be established with the available runtime tooling.

## Batch 8 — Configuration → Job Positions → Contract Types

Source trace: Odoo 19 `addons/hr_recruitment/views/menuitems.xml` places the
inherited `hr.menu_view_hr_contract_type` under Recruitment → Configuration →
Job Positions → Contract Types (`sequence=2`, `groups=hr.group_hr_user`). Its
action is inherited from `addons/hr/views/hr_contract_type_views.xml` as
`hr.hr_contract_type_action`, model `hr.contract.type`, title `Employment
Types`, and view mode `list`. The list is `editable="bottom"` and orders by
sequence; visible fields are Sequence (handle) and Name, with Code invisible
and Country optional/hidden. The form contains Name, invisible Code, and
Country. Odoo's HR access row grants the HR-user boundary full CRUD; this
Core3 slice maps that shared HR-user requirement to the existing
`recruitment.manage` manager-equivalent permission.

Core3 adds `/recruitment/contract-types` with page id
`recruitment-contract-types`, a presentation-only Odoo-style list page, and a
page-scoped API fragment joined by the same `page.id`. The migration
`20260912110000-011-recruitment-contract-types.yaml` seeds the fixed Odoo HR
catalog (Permanent, Temporary, Interim, Seasonal, Full-Time, Part-Time,
Intern, Student, Apprenticeship, Thesis, Statutory, Employee), preserving
the source sequence order and deterministic codes. Manager-only list/search,
bottom-create/edit/delete actions cover required and duplicate names,
missing/not-found, stale row versions, empty, forbidden, and transport-error
states. Contract types are configuration metadata only: they do not mutate
applicants, stages, or the Recruitment workflow transitions; applicant and
stage writes remain governed by their existing `recruitment.write` and
`recruitment.manage` contracts.

Focused verification:

- `bun test test/recruitment_contract_types.integration.test.ts` — 3 passed,
  0 failed, 27 assertions.
- `bun run audit` — passed: 613 pages, 622 routes, 1056 datasources.
- Authenticated desktop/mobile visual evidence is blocked for this batch;
  see the capture note below. No visual-parity claim is made and no images
  are committed.
- `git diff --check` and focused ESLint are recorded after the capture
  attempt.

### Batch 8 capture attempt and limitation

The required capture directory was created at `/tmp/core3-odoo-parity` and
the exact `1440x900` and `390x844` browser attempts were made. The isolated
Core3 start command reached Vite on port 3002 but its backend exited during
YAML startup with the pre-existing unrelated error
`Named action sms_marketing.mailings.cancel permission does not match its
workflow transition`; the target route therefore returned
`ERR_CONNECTION_REFUSED` and no authenticated Core3 surface was available.
The Odoo server on port 8069 responded, but both login attempts remained on
the login page, so the credentials/session needed to inspect the installed
contract-type action were not available in this run. The only generated
images in `/tmp/core3-odoo-parity` are these unauthenticated blocker states;
they are not parity evidence and remain outside Git. No desktop/mobile visual
claim is made.

## Batch 7 — Configuration → Job Positions → Stages

Source evidence: Odoo 19 `addons/hr_recruitment/views/menuitems.xml` defines
`menu_hr_recruitment_stage` under Recruitment → Configuration → Job Positions
→ Stages, with action `hr_recruitment_stage_act`, model
`hr.recruitment.stage`, and view modes `list,kanban,form`. The source action
`addons/hr_recruitment/views/hr_recruitment_stage_views.xml` uses a list with
Sequence, Stage Name, Days to rot, Folded in Recruitment Pipe, and Hired Stage;
its kanban card shows the stage name and folded flag. The form has Stage
Definition, Tooltips, and Requirements sections, including email template,
job-specific stages, rotting threshold, four kanban legends, and requirements.
The source menu is restricted to `base.group_no_one`; Core3 maps this hidden
technical menu to the existing manager-equivalent `recruitment.manage` boundary
and documents the deliberate visibility mapping.

Core3 implements `/recruitment/stages` with page id `recruitment-stages`, a
visible List/Kanban tab navigation, and a separate form page
`/recruitment/stages/detail` with page id `recruitment-stage-detail`. Page YAML
contains presentation only; `api/stages.yaml` and `api/stage-detail.yaml` bind
their datasources/actions through matching page ids. Migration
`20260912100000-010-recruitment-stages.yaml` is idempotent and seeds the six
fixed Odoo stages, including the folded hired stage and realistic rotting and
requirements fixtures. Manager-only datasource and mutations cover forbidden,
transport, empty/not-found, duplicate/required/invalid values, missing rows,
stale row versions, create, update, and delete states.

Focused evidence:

- `bun test test/recruitment_stages.integration.test.ts` — 3 passed, 0 failed,
  31 assertions.
- `bun run audit` from `sdk/bun/sample` — passed: 584 pages, 591 routes,
  1003 datasources.
- `bunx eslint test/recruitment_stages.integration.test.ts` — passed.
- `git diff --check` — passed.

Authenticated visual evidence is not available for this batch. The required
Core3 runtime could not remain online because concurrent isolated parity agents
exhausted the shared Linux file-watch limit (`EMFILE`); the direct server
fallback also could not connect to the local database dependency. Therefore no
desktop `1440x900` or mobile `390x844` Core3 capture, Odoo/Core3 comparison,
or visual-parity claim is made. Screenshots were not added to Git.

This document remains the implementation gate and evidence record. Batch 1
implements the coherent Core3 job-position/openings and applicant queues,
including list/kanban/detail/filter/workflow states. Batch 2 adds the
Recruitment Analysis graph/pivot action with deterministic report fixtures,
search filters, and explicit empty/failed datasource states. Batch 4 adds the
bounded Talent Pools list/kanban/form and applicant-membership action.

## Batch 6 — Configuration → Applications → Tags

Implemented in the isolated worktree
`/home/nhanjs/projects/core3-worktrees/odoo-ui-recruitment-next-20260911`.
The live authenticated Odoo 19 `core3_codex_demo` reference was inspected as
`codex@core3.local` on 2026-09-11. The selected uncovered action is Recruitment
→ Configuration → Applications → Tags, menu `hr_applicant_category_menu`,
action `hr_applicant_category_action`, model `hr.applicant.category`, and live
action URL `/odoo/action-719`. The source XML
`addons/hr_recruitment/views/hr_applicant_category_views.xml` defines a Tags
list with `name` and `color` (`color_picker`), editable at the bottom, plus a
two-field Tags form. The demo list is ordered Reserve, Manager, IT, Sales with
color indexes 3, 10, 1, and 3 respectively.

Core3 adds `/recruitment/tags` with page id `recruitment-tags`, a page-local
ListView fragment, and a matching API fragment joined by `page.id`. The
service-owned migration `20260912090000-009-recruitment-tags.yaml` creates
`recruitment_tags`, seeds the four deterministic reference records, and keeps
an internal display sequence so the live Odoo order is stable. Manager-only
read/create/update/delete permissions are enforced through
`recruitment.manage`; duplicate names, blank names, color indexes outside
0–11, missing rows, and stale row versions are guarded. Search, empty,
transport-error, forbidden, and CRUD contracts are covered by the focused
integration test.

The page now uses the existing shared `ListView.inline_edit` contract. Its
bottom editor is wired to `create_recruitment_tag` and
`edit_recruitment_tag`, exposes the two source fields (`name` and the
0–11 `color` picker), and renders Save/Discard controls. The existing mobile
inline-edit behavior wraps the color palette at 390px; the non-source id/action
column remains hidden on mobile while row tap still opens edit. No new shared
component or modal variant was added for this correction.

Implementation commit:

- `c49927b1` — add Recruitment Tags page/API, migration,
  permissions/guards, focused tests, manifest entry, and inline bottom editing

### Batch 6 browser comparison evidence

Authenticated Odoo and Core3 captures were inspected at exact 1440×900 and
390×844 viewports. Core3 used `admin@tms.local` on the isolated runtime at
`http://localhost:3006/recruitment/tags`; Odoo used `codex@core3.local` on
`http://localhost:8069/odoo/action-719`. Both surfaces showed four populated
rows, matched order/color semantics, and zero `requestfailed` or `pageerror`
events. Core3 browser QA exercised bottom-row create, inline rename/color
update, and delete. Document and table widths were exact at both viewports
with no browser-level horizontal overflow; the mobile create capture shows
the 12-color palette wrapping inside the 390px viewport.

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Tags list | 1440×900 | `/tmp/odoo-recruitment-tags-inline-desktop-1440x900-20260911.png` | `74738ed6e55519db73118d0d9b7b6a3669f485e7d40a512442739dd078ad7091` |
| Odoo Tags list | 390×844 | `/tmp/odoo-recruitment-tags-inline-mobile-390x844-20260911.png` | `6a4a5ee25972e90bf14a917568763ba299c6d577c2c07607f84b6d8e95179520` |
| Odoo bottom-create editor | 1440×900 | `/tmp/odoo-recruitment-tags-inline-create-desktop-1440x900-20260911.png` | `071c89ed13482aa382fa45bef52002a1f994b5ee074330a483c980a9e5d22ee4` |
| Odoo bottom-create editor | 390×844 | `/tmp/odoo-recruitment-tags-inline-create-mobile-390x844-20260911.png` | `7324270e2b41f89c700d6d2ba2f65b4f6984f21e8fb6608c0dcdb0092888530c` |
| Core3 Tags list | 1440×900 | `/tmp/core3-recruitment-tags-inline-desktop-1440x900-20260911.png` | `1fadee85c933ffe375ae703db0e26c21cf913b53cbf4932fe27cd8c489d458a9` |
| Core3 Tags list | 390×844 | `/tmp/core3-recruitment-tags-inline-mobile-390x844-20260911.png` | `05bd2444c138b8efa4ff2190ed047fdab68a5eaec1cd3d4238f4414f0b9c4164` |
| Core3 bottom-create editor | 1440×900 | `/tmp/core3-recruitment-tags-inline-create-desktop-1440x900-20260911.png` | `885c3ed4aa66278a29be0bccb58f4622d36b0fa9ed2090aa43cb1a759db7afa7` |
| Core3 bottom-create editor | 390×844 | `/tmp/core3-recruitment-tags-inline-create-mobile-390x844-20260911.png` | `09527938f3b57d86e8ee7a2a4da14230209dde8bbe70fb0d979544c02ccef8a6` |

The docs/evidence commit for this batch is recorded after the implementation
commit. Screenshots remain under `/tmp` and are not committed. The remaining
visual differences are limited to the surrounding Odoo/Core3 application shell
and swatch palette styling; the source action's inline editing interaction is
implemented by the shared Core3 ListView contract.

### Batch 6 focused verification

- `bun test test/recruitment_tags.integration.test.ts` — 3 passed, 0 failed,
  37 assertions
- `bun run audit` — passed: 504 pages, 511 routes, 888 datasources
- `bun run lint` from `sdk/bun` — passed
- `bun run css:build:global` and `bun run css:build:recruitment` — passed
- `git diff --check` — passed
- Isolated runtime was stopped after browser QA

## Batch 5 — Configuration → Applications → Refuse Reasons

Implemented in the isolated worktree
`/home/nhanjs/projects/core3-worktrees/odoo-ui-recruitment-refuse-reasons-20260911`.
The source-confirmed action is available in the authenticated personal
reference: Recruitment → Configuration → Applications → Refuse Reasons,
action `hr_applicant_refuse_reason_action`, model
`hr.applicant.refuse.reason`, and view modes `list,form`. Odoo resolves the
installed action to `/odoo/action-649` in database `core3_personal`.

The Odoo list contains six deterministic reference records ordered by
sequence: `Refused by applicant: salary`, `Refused by applicant: job fit`,
`Does not fit the job requirements`, `Job already fulfilled`, `Duplicate`, and
`Spam`. The source form exposes Description and the applicant email-template
relation; sequence is list ordering and active is kept invisible in the form.
The source access file gives recruitment users CRUD and interviewers read-only
access. Core3 deliberately maps this configuration route to the existing
manager permission `recruitment.manage`, keeping the menu, list datasource,
create/edit/archive/restore/delete actions, and page authorization manager-only.

Core3 adds `/recruitment/refuse-reasons` with page id
`recruitment-refuse-reasons`, a page-local list YAML fragment and a matching
API fragment. Migration `20260911150000-006-recruitment-refuse-reasons.yaml`
adds stable IDs, fixed templates, an archived legacy fixture, and the
`recruitment_applicants.refuse_reason_id` / `refused_date` linkage. Applicant
detail now displays the linked reason and offers a manager-only reasoned Refuse
form. That form validates an active reason, rejects invalid/stale/closed
applications, archives the applicant, and writes the fixed seed date
`2026-01-15`. No page-local SQL, current/random fixture values, or screenshots
are committed.

Commits for this batch:

- `b51bad18` — implementation, migration, page/API fragments, applicant linkage, and focused tests
- `3b41fd0e` — isolate the reason-aware refusal action from the existing workflow action name
- `44a4f3a6` — align create/edit form fields with Odoo's invisible active field

### Browser comparison evidence

Authenticated Odoo and Core3 captures were inspected at 1440×900 and
390×844. Core3 used `admin@tms.local` on the isolated runtime at
`http://localhost:3004`; the desktop refusal flow was submitted through the
visible form and verified as `Rejected`, reason `Spam`, and refused date
`2026-01-15`. Every capture below is outside Git.

| Surface | Viewport | Exact path | SHA-256 |
| --- | --- | --- | --- |
| Odoo list | 1440×900 | `/tmp/odoo-recruitment-refuse-reasons-20260911/list-desktop.png` | `f6c25e5ca9edf30a32e5af07c443ca5da27530d0847d08c4de8da259325cd42c` |
| Odoo form | 1440×900 | `/tmp/odoo-recruitment-refuse-reasons-20260911/form-desktop.png` | `3b23e146e099348dd6dc8a6478641953d4fc50c29b1f8b8c999cb545f38fc1eb` |
| Odoo list | 390×844 | `/tmp/odoo-recruitment-refuse-reasons-20260911/list-mobile-390x844.png` | `55845a5988bd611b3d7681a345f330ed839f548c7abb16bec7cb8020f0b79855` |
| Odoo form | 390×844 | `/tmp/odoo-recruitment-refuse-reasons-20260911/form-mobile-390x844.png` | `5882ff0c6f2c37f2a0c1f718c29009d1ecfba782e59f6f70b19e87c67a5f8130` |
| Core3 list | 1440×900 | `/tmp/core3-recruitment-refuse-reasons-20260911/core3-list-desktop-1440x900-final.png` | `7ff0278a76c1aa203012dd3767ccac518bfa1ada057b9af29a1d779032d4f2fc` |
| Core3 form | 1440×900 | `/tmp/core3-recruitment-refuse-reasons-20260911/core3-form-desktop-1440x900-final.png` | `15206f547e6f4484b25f9b356feee560fc69a798167b3df6b3fb73ba9f1d45cd` |
| Core3 applicant refusal modal | 1440×900 | `/tmp/core3-recruitment-refuse-reasons-20260911/core3-refuse-modal-desktop-1440x900-final.png` | `74a05a78d88e64dcbfc1d4c863b0d889a003604d2ca6ba21b8ec453dfe21bd32` |
| Core3 list | 390×844 | `/tmp/core3-recruitment-refuse-reasons-20260911/core3-list-mobile-390x844-final.png` | `70f86685a487261a735ba48cf28764c1e85a297330946812d5d47cb3a31cce60` |
| Core3 form | 390×844 | `/tmp/core3-recruitment-refuse-reasons-20260911/core3-form-mobile-390x844-final.png` | `5b50c423ad3f6ca84e966aa178fe312881c61fc135fd48dea36afe20260567c2` |
| Core3 applicant refusal modal | 390×844 | `/tmp/core3-recruitment-refuse-reasons-20260911/core3-refuse-modal-mobile-390x844-final.png` | `ab8bc501719a04b1e4c8c0a3002d8bade6559b4f3a6ba07983ef2c8a4b79039e` |

The visual residuals are the shared Core3 shell versus Odoo's purple shell,
Core3's centered modal edit form versus Odoo's inline editable list, and
different toolbar/icon density. Both mobile layouts use truncation for long
descriptions/templates; Core3 hides sequence on mobile as Odoo does. Core3's
template selector is a fixed service-owned label list rather than the full
`mail.template` relation. The applicant refusal scope is intentionally the
reason-selection/archive linkage only: Odoo's duplicate-applicant, email
delivery, no-email, refusal-mail-template, chatter, and bulk-wizard flows are
deferred.

### Focused verification

- `bun test test/recruitment_refuse_reasons.integration.test.ts` — 4 passed, 0 failed, 52 assertions
- `bun run audit` — passed: 478 pages, 485 routes, 834 datasources
- `bunx eslint test/recruitment_refuse_reasons.integration.test.ts` — passed
- `bun run css:build:global` and `bun run css:build:recruitment` — passed
- `git diff --check` — passed
- Authenticated browser — populated/search/form/refusal submission on desktop, populated/form/refusal modal on mobile; no failed responses, page errors, or viewport overflow

## Reference gate and exact limitation

- Odoo source is `/home/nhanjs/projects/odoo`, revision
  `659759969d535d286b656c96b675e4612b925ddd` (`65975996`), addon
  `addons/hr_recruitment`.
- The authenticated reference is `http://localhost:8069`, database
  `core3_reference`, checked on 2026-09-10 as `codex@core3.local` using the
  personal credentials in the parent register. Login succeeds and the Odoo
  shell is `19.0-20260908`.
- `hr_recruitment` is installed with demo data in `core3_reference`. The live
  launcher exposes Recruitment and `/odoo/recruitment` opens the default
  Job Positions action. Reporting → Recruitment Analysis resolves to the
  runtime-generated action URL `/odoo/action-655`.
- Installed-reference screenshots for this batch are under `/tmp/odoo-recruitment/`:
  `analysis-graph-desktop.png`, `analysis-graph-mobile.png`,
  `analysis-pivot-desktop.png`, and `analysis-pivot-mobile.png`. They were
  captured only after asserting the Recruitment title, menu, action title, and
  loaded graph/pivot controls. Images are not committed.

## Addon, manifest, demo, and source evidence

`addons/hr_recruitment/__manifest__.py` declares name `Recruitment`, version
`1.1`, category `Human Resources/Recruitment`, `application: True`, and
`installable: True`. It depends on `hr`, `calendar`, `utm`,
`attachment_indexation`, `web_tour`, and `digest`. It loads security, data,
views, and wizards, and registers backend JS/SCSS/XML assets under
`web.assets_backend`. Official demo data is declared by
`data/hr_recruitment_demo.xml`; it is not loaded in the live `core3_demo`
database because the addon is uninstalled. The data files also include
standard stages, templates, mail subtypes, departments, degrees, sources,
refuse reasons, and the recruitment tour. Demo applicants include Enrique
Jones, Meldona Thang, Emily Brooks, Alex Parker, Natalie Foster, Johan Duck,
Kelly Wallant, Cécile Donth, Ohen Rizome, Marie Justine, Lucas Anderson, Jose,
Daniel Parker, Lily Patterson, and Jordan Ellis, with job, department, source,
priority, stage, archive/refuse, and date variations. Use these as semantic
fixture cases, not as copied time-dependent data.

## Source menu, action, route, and view inventory

The source menu is `views/menuitems.xml`. Odoo 19 action URLs are client-side
action routes; this addon does not declare a stable `path` attribute. The
installed-browser audit must record the final `/odoo/...` URL for every action.
The Core3 route column is the current route or the route that the later batch
must add. “Runtime-generated” is deliberate: it must not be replaced by a
guessed Odoo URL while the reference is unavailable.

| Menu | Visible action / source id | Model and Odoo view modes | Core3 route / status |
| --- | --- | --- | --- |
| Recruitment → Applications → By Job Positions | `action_hr_job` | `hr.job`; `kanban,list,form` | `/openings`; existing partial |
| Recruitment → Applications → By Job Positions (Interviewer) | `action_hr_job_interviewer` | `hr.job`; `kanban,form`, create disabled, interviewer domain | same `/openings`; permission variant required |
| Recruitment → Applications → By Talent Pools | `action_hr_talent_pool` | `hr.talent.pool`; `kanban,list,form` | no Core3 route; add `/talent-pools` or deliberate defer |
| Recruitment → Applications → All Applications | `crm_case_categ0_act_job` | `hr.applicant`; `kanban,list,form,pivot,graph,calendar,activity` | `/applicants`; existing partial |
| Recruitment → Reporting → Recruitment Analysis | `hr_applicant_action_analysis` | `hr.applicant`; `graph,pivot` | `/recruitment-analysis`; existing partial |
| Recruitment → Configuration → Settings | `action_hr_recruitment_configuration` | `res.config.settings`; `form` | no Core3 route; add `/recruitment-settings` |
| Configuration → Job Positions → Stages | `hr_recruitment_stage_act` | `hr.recruitment.stage`; `list,kanban,form` | no Core3 route; group `base.group_no_one` |
| Configuration → Job Positions → Contract Types | inherited `hr.hr_contract_type_action` | inherited `hr.contract.type`; source action/view contract | deliberate shared-HR integration or defer |
| Configuration → UTMs → Sources | inherited `utm.utm_source_action` | `utm.source`; inherited list/form/search | deliberate shared-UTM integration or defer; `base.group_no_one` |
| Configuration → UTMs → Mediums | inherited `utm.utm_medium_action` | `utm.medium`; inherited list/form/search | deliberate shared-UTM integration or defer; `base.group_no_one` |
| Configuration → Applications → Degrees | `hr_recruitment_degree_action` | `hr.recruitment.degree`; list/form | no Core3 route; add `/recruitment-degrees` |
| Configuration → Applications → Refuse Reasons | `hr_applicant_refuse_reason_action` | `hr.applicant.refuse.reason`; `list,form` | no Core3 route; add `/refuse-reasons` |
| Configuration → Applications → Tags | `hr_applicant_category_action` | `hr.applicant.category`; list/form | no Core3 route; add `/recruitment-tags` |
| Configuration → Employees → Departments | `action_hr_department` | `hr.department`; `list,form` with HR kanban inheritance | deliberate shared-Employees integration or defer |
| Configuration → Activities → Activity Types | `mail_activity_type_action_config_hr_applicant` | `mail.activity.type`; `list,kanban,form`, domain for `hr.applicant` | shared activity configuration or defer; `base.group_no_one` |
| Configuration → Activities → Activity Plans | `mail_activity_plan_action_config_hr_applicant` | `mail.activity.plan`; `list,kanban,form`, domain `res_model=hr.applicant` | shared activity-plan integration; manager-only |
| Configuration → Job Boards → Emails | `action_hr_job_platforms` | `hr.job.platform`; `list,form` | no Core3 route; add `/recruitment-emails` |

The source also defines linked or non-menu actions that must be accounted for:
`action_hr_job_new_application` (new applicant form from a job),
`create_job_simple` (medium job-position creation dialog),
`action_load_demo_data` (server action), `action_applicant_send_mail` (bound
Send Email), `mail_followers_edit_action_from_hr_recruitment` (followers
dialog), `applicant_get_refuse_reason_action` (refuse wizard),
`job_add_applicants` (add applicants to a job), and
`talent_pool_add_applicants` (add applicants to a talent pool). These are
part of the form/action contract even when no top-level menu is shown.

Required applicant view states are list (`crm_case_tree_view_job` and the
next-activities list), form (`hr_applicant_view_form`, including interviewer
inheritance), pivot (`crm_case_pivot_view_job` and analysis pivot), graph
(`crm_case_graph_view_job` and analysis graph), search
(`hr_applicant_view_search_bis` and analysis search), calendar
(`hr_applicant_calendar_view`), quick-create form, kanban
(`hr_kanban_view_applicant`), and activity (`hr_applicant_view_activity`).
Required job-position states are recruitment kanban, inherited job list and
form, search panel, simple-create form, and interviewer read-only variant.
The stage and talent-pool contracts include list/kanban/form. Degree, source,
category, refuse-reason, platform, department, activity type, and activity
plan contracts include the source list/form (and kanban where listed above).
Settings and all wizard/dialog forms are separate states, not list fallbacks.

## Source behavior and visible interaction contract

- Applicants need a pipeline kanban grouped by stage, list with optional
  columns, multi-edit/bulk actions, quick create, search, filters and group
  by, plus form statusbar and chatter. Preserve applicant, email, phone, job,
  department, recruiter, source/medium, tags, degree, availability, priority,
  stage, refused/archived reason, activities, attachments/CV, followers,
  notes, interview, hire, and email controls. Valid state changes include
  new → first screening → first interview → contract proposal → contract
  signed; refusal/archive and restore must be explicit guarded actions.
- Job positions need kanban cards with applications, hired count, target,
  department, recruiter, published status and job-board actions; list/form,
  create-job dialog, interviewer read-only mode, application stat/action
  buttons, stages, expected degree, interview form, website/online application
  options, email aliases/templates, and archived/closed states.
- Talent pools need list/kanban/form, applicants relation, add-applicants
  dialog, archive, and filtered applicant action. Configuration needs editable
  degrees, sources, tags, refuse reasons, stages, departments, activity types
  and plans, job-board emails, and manager/system settings. Group-hidden
  `base.group_no_one` and manager-only entries must remain hidden, not merely
  disabled.
- Reporting needs graph and pivot measures/groupings based on applicant
  creation/stage dates, job, department, recruiter, source, medium, stage,
  company and probability, with analysis empty/loading/error states.
- Every list/form/kanban/report state needs loading, populated, empty,
  failed-datasource, unauthorized, forbidden, missing-record, validation,
  stale-row conflict, and mobile variants. Keep app shell, breadcrumbs,
  control panel, search facets, group-by, pager, view switcher, optional
  columns, import/export/share, action menus, dialogs, chatter, activities,
  attachments, notifications and responsive overflow consistent with Odoo.

## Existing Core3 service and parity gap

The existing service is `sdk/bun/sample/services/recruitment` with manifest,
permissions, storage, two migrations, four page files, a workflow, and styles.
It currently provides `/applicants`, `/openings`, and
`/recruitment-analysis`, with applicant detail registered as an internal page;
permissions are `recruitment.read`, `recruitment.write`, and
`recruitment.manage`. Its data is two tables (`recruitment_openings` and
`recruitment_applicants`), a New → Screening → Interview → Offer → Hired /
Rejected workflow, applicant form actions, and basic list/opening/analysis
pages. It does not yet cover the source talent-pool, configuration, job-board,
activity, CV/attachment, chatter, settings, or complete Odoo view-mode
surface. The current pages also contain SQL and current/random defaults in
migrations; the implementation batch must move backend responsibility into
convention-discovered `services/recruitment/api/` fragments keyed by
`page.id`, leaving layout YAML data-source-only and out of any explicit
frontend `pages:` manifest.

## Shared UI primitives to verify before module-specific work

Reuse and extend generic contracts rather than creating recruitment-only
renderers:

- Odoo shell, launcher/menu tree, breadcrumb, control panel, search bar,
  search facets, filters, search panel, group-by, pager, optional columns,
  bulk actions and list/kanban/form/calendar/activity/graph/pivot switcher;
- Odoo ListView and responsive table/cards, Kanban with grouped stages,
  quick-create, drag/status affordances and action menus;
- OdooFormView/FormView, notebook/tabs, statusbar, header buttons, stat
  buttons, two-column groups, read-only/interviewer fields, dialogs, wizard
  forms, many2one/many2many selectors, tags, priority/rating, dates,
  attachments/CV preview, chatter, activities and followers;
- Chart, Pivot, Calendar and Activity primitives with deterministic
  datasource loading plus empty/error/permission states;
- SettingsView with full-width Odoo content, no breadcrumb, content-only
  scrolling, responsive sections and manager/system controls;
- server-form/server-action, guarded workflow mutation, archive/restore,
  email/refuse/add-applicant/follower actions, notifications, i18n, auth,
  responsive overflow and network-failure shields.

Any missing primitive/API contract must be recorded and implemented at the
shared layer before a recruitment-specific workaround is considered.

## Deterministic fixture and API contract

Every route and view mode must have a service-owned datasource or action.
Use stable IDs and explicit fixed dates (seed date `2026-01-15`), stable
ordering, bounded search/filter/group/pager results, and idempotent DuckDB and
supported-adapter migrations. Remove `CURRENT_DATE`,
`CURRENT_TIMESTAMP`, `gen_random_uuid()` and cross-service SQL from the
recruitment fixture path. Prove fresh install and upgrade.

At minimum provide deterministic fixtures for:

- companies, users and recruiter/interviewer/manager permission cases;
  openings in draft/recruiting/closed/archived states; departments, stages,
  degrees, sources/media, tags, refuse reasons, platforms, activity types and
  plans;
- applicants across every stage, priority/rating, source, job, recruiter,
  department, availability/interview/hire dates, archived/refused records,
  CV/attachment, chatter, follower, activity and empty search results;
- talent pools and applicant membership; job-position application counts;
  stat-button/filter domains; report rows with stable dates and measures;
- list, kanban, form, calendar, activity, graph, pivot, populated and empty
  datasets; loading/error data-source responses; quick-create and all dialog
  response shapes;
- create/edit/archive/restore/refuse/screen/interview/offer/hire actions,
  email/refuse reason/add-applicant/follower/activity/settings mutations,
  invalid transition, missing record, validation, unauthorized/forbidden and
  stale `row_version` 409 responses. Keep opening hired counts consistent
  with applicant transitions.

Public Core3 permissions may remain `read/write/manage`, but server behavior
must map to Odoo's Interviewer, Officer: Manage all applicants, Administrator,
Display CV on application form, system settings, and company rules. Interviewers
cannot create or delete applicants and use the interviewer job action; officers
manage all applicants; administrators manage configuration and activity plans;
CV visibility is group-controlled; applicant records obey the multi-company
rule `company_id in company_ids + [False]`.

## Acceptance checks and evidence

The implementation batch is accepted only when:

- every source menu/action above has a Core3 route and datasource/action, or a
  written deliberate shared-module defer/hidden decision with the same group
  boundary; every source view mode and linked wizard is exercised;
- fresh-install/upgrade, idempotent deterministic migrations, API-fragment
  discovery, YAML/schema/audit, no page-local SQL, and no random/current-time
  fixture checks pass; workflow guards and stable totals pass focused tests;
- authenticated Core3 Playwright checks at 1440x900 and 390x844 cover menu,
  routes, search/filter/group, list/kanban/form/calendar/activity/graph/pivot,
  detail navigation, create/edit, every valid/invalid transition, dialogs,
  configuration/settings, empty/loading/error/unauthorized/forbidden/missing
  states, mobile fit/no unexpected horizontal overflow, and failed requests;
- Odoo installed-reference screenshots are captured only after asserting the
  Recruitment app/menu/title and loaded records, at the same desktop/mobile
  viewports, under `/tmp/odoo-recruitment/`. The current fallback files listed
  above must remain labeled uninstalled and cannot satisfy visual parity;
- Interviewer, Officer, Administrator/system, CV-display, another-company,
  and denied-user checks prove menu visibility, record scope, field visibility,
  settings access, mutation permissions, and 401/403/404/409/422 behavior.

## Focused pre-implementation validation

Completed for the original plan gate: source manifest, menu/action/view,
security, demo-data and Core3 service inspection; authenticated desktop and
mobile login; authenticated launcher/apps-catalog check; and source revision
verification. The personal Odoo database now provides the installed live
reference used by Batch 2.

Run from `sdk/bun/sample` after implementation:

```sh
bun run audit
git diff --check
```

The sample package does not define a separate `audit:yaml` script; YAML/schema
validation runs during page discovery and the focused recruitment tests.
Also run the focused recruitment migration/API/schema tests and the complete
authenticated desktop/mobile Playwright matrix described above. Batch 2
captures are under `/tmp/core3-recruitment/analysis-*.png` at 1440x900 and
390x844; images are intentionally not committed.

## Batch 1 implementation record

Implemented in the isolated worktree: service-owned API fragments under
`services/recruitment/api/` keyed by `page.id`; deterministic foundation and
parity fixtures seeded at `2026-01-15`; page YAML reduced to layout contracts;
job-position and applicant list/kanban views; applicant detail form with the
Odoo pipeline statusbar; filter/group/search contracts; guarded screening,
interview, proposal, hire, and refuse actions; and deterministic opening
application counts. Shared ListView, KanbanView, FormView, search, filter, and
responsive primitives are reused without a recruitment-only renderer.

Deliberate defer for a later batch: talent pools, configuration/reference data,
settings, job-board email actions, reporting calendar/activity, CV/chatter,
and interviewer-specific permissions.

## Batch 2 implementation record — Recruitment Analysis

The installed personal Odoo action was inspected from the source contract and
live browser. Its view order is `graph,pivot`; the default search context shows
`Creation Date: Month > Jobs`; the graph exposes Measures and chart controls;
and the pivot is grouped by stage with job-position columns and a Count
measure. Core3 now maps the Reporting → Recruitment Analysis menu to a
presentation-only ListView with visible Graph/Pivot tabs in that order. Its
page-owned API fragment returns stable stage/job/department/responsible counts,
supports the report filters and search, declares pivot fields, and exposes
empty, missing-fixture, and 503 transport-error behavior without page-local
SQL.

Authenticated evidence was captured at both required viewports and compared
against the installed reference:

- Core3: `/tmp/core3-recruitment/analysis-graph-desktop.png`,
  `analysis-graph-mobile.png`, `analysis-pivot-desktop.png`, and
  `analysis-pivot-mobile.png`.
- Odoo: `/tmp/odoo-recruitment/analysis-graph-desktop.png`,
  `analysis-graph-mobile.png`, `analysis-pivot-desktop.png`, and
  `analysis-pivot-mobile.png`.

The shared analytics empty-state handoff was extended so this module retains
the Odoo `No data yet!` copy in Graph and Pivot states. The Recruitment pivot
opts out of duplicate leaf rows so its single-stage grouping matches Odoo.
The remaining visual delta is the shared Core3 chart renderer's intentionally smaller control set
and deterministic three-record fixture volume; the action, tabs, responsive
fit, search, pivot grouping, and report state contracts are covered by the
focused test and browser evidence. Configuration, talent pools, calendar,
activity, CV/chatter, and interviewer-specific permission parity remain later
batches.

## Batch 3 implementation record — Recruitment Degrees

The installed Odoo action `hr_recruitment_degree_action` was inspected against
`hr_recruitment_degree_views.xml` in the owned `core3_owned` demo database; its
live action URL was `/odoo/action-917`. It exposes the editable Degrees list with
`name`, `score`, and `sequence`, plus a Degree form. Core3 now maps
Recruitment → Configuration → Applications → Degrees to
`/recruitment/degrees`, with page-owned API fragments, deterministic Odoo
degree fixtures, manager-only permissions, duplicate and score-range
validation, stale-row and missing-record guards, and create/edit/delete
mutations. Search, empty, and transport-error datasource states are explicit.

Authenticated evidence was captured at both required viewports and compared
against the installed reference:

- Core3: `/tmp/core3-recruitment/degrees-desktop.png` and
  `/tmp/core3-recruitment/degrees-mobile.png`.
- Odoo: `/tmp/odoo-recruitment/degrees-desktop.png` and
  `/tmp/odoo-recruitment/degrees-mobile.png`.

Screenshots are intentionally not committed.

## Batch 4 implementation record — Recruitment Talent Pools

The installed personal Odoo reference was inspected from
`/home/nhanjs/projects/odoo` at revision
`659759969d535d286b656c96b675e4612b925ddd` and from the authenticated
`http://127.0.0.1:8069` instance in database `core3_personal` on 2026-09-11.
The source contract is `action_hr_talent_pool` with `kanban,list,form` and
the linked `talent_pool_add_applicants` dialog. The live reference showed the
Developer pool, manager/company/tags, three talents, and the Add Applicants
dialog. The Odoo action routes observed were `/odoo/talent-pool`,
`/odoo/talent-pool/1`, and the runtime-generated
`/odoo/talent-pool/1/action-651`.

Core3 implements `/recruitment/talent-pools`,
`/recruitment/talent-pools/detail?id=talent-pool-developers`, and
`/recruitment/talent-pools/talents?pool_id=talent-pool-developers`. The page
YAML remains layout-only and the page-scoped API YAML is joined by matching
`page.id`. The migration seeds stable Developer, Engineering Bench,
Leadership Shortlist, and archived 2025 Archive pools, deterministic
memberships, and two unpooled active applicants for the add-membership flow.
Create/edit/archive/restore/delete and membership add/remove actions use the
existing recruitment service with recruitment-manager permissions, duplicate
and validation guards, missing/transport/empty states, and row-version
concurrency checks. No page-local SQL or generated/current-time fixture data
was added.

Authenticated browser evidence was captured and inspected at exact viewport
sizes. Screenshots are outside Git under `/tmp`:

| System | State | Path | Dimensions | SHA-256 |
| --- | --- | --- | --- | --- |
| Odoo | kanban desktop | `/tmp/odoo-recruitment/talent-pools-kanban-desktop-1440x900-20260911.png` | 1440x900 | `46609fe882e08e2b3e5137aef2a3b39cdee7774243bf7df29a6f85d21c2661e8` |
| Odoo | list desktop | `/tmp/odoo-recruitment/talent-pools-list-desktop-1440x900-20260911.png` | 1440x900 | `592153d157e694fc098e74dc37d18736a703d6dc65c6c6cfc9c7bc935f762e0d` |
| Odoo | detail desktop | `/tmp/odoo-recruitment/talent-pool-detail-desktop-1440x900-20260911.png` | 1440x900 | `aa63aaedb01f0272c3f5ef1218f76e3c867d292055dd4c75f5fc06dbf2eef363` |
| Odoo | talents desktop | `/tmp/odoo-recruitment/talent-pool-talents-desktop-1440x900-20260911.png` | 1440x900 | `cace04918d9b2d179eeafbc832c94e3e701fb3699a74667400e004f8de019b20` |
| Odoo | add-applicant desktop | `/tmp/odoo-recruitment/talent-pool-add-applicant-desktop-1440x900-20260911.png` | 1440x900 | `448e1ea894df45f384b2e1e1c032cd8b8a08afbf8d7302ae534fa2a916c16839` |
| Odoo | kanban mobile | `/tmp/odoo-recruitment/talent-pools-kanban-mobile-390x844-20260911.png` | 390x844 | `2b167a49d34133f44fc0d0d708d74e5bcef00c0fe3a103ab424cb3e1e15f5e37` |
| Odoo | detail mobile | `/tmp/odoo-recruitment/talent-pool-detail-mobile-390x844-20260911.png` | 390x844 | `32b659832cc4e0ea92a3857b161b23da90d6654389704b819453cad83d311a01` |
| Odoo | talents mobile | `/tmp/odoo-recruitment/talent-pool-talents-mobile-390x844-20260911.png` | 390x844 | `821a6857d71d1705585cb20080864351558053da16e5f251b3a6f5085b93aafc` |
| Core3 | kanban desktop | `/tmp/core3-recruitment/talent-pools-kanban-desktop-1440x900-20260911.png` | 1440x900 | `b62da99e2544686773ba665147ef384547ab509461292789812ba4d1642bedbf` |
| Core3 | detail desktop | `/tmp/core3-recruitment/talent-pool-detail-desktop-1440x900-20260911.png` | 1440x900 | `7004533bb639bf1e1490915305304fe0b04e77885e7bdbcc807aa9d265fc1f21` |
| Core3 | talents desktop | `/tmp/core3-recruitment/talent-pool-talents-desktop-1440x900-20260911.png` | 1440x900 | `74a8db86d000e5d866e7318b3cfdb24144450f5b3b39b29a6fb620f2ca01205f` |
| Core3 | add-applicant desktop | `/tmp/core3-recruitment/talent-pool-add-applicant-desktop-1440x900-20260911.png` | 1440x900 | `e54d7a086b67267fa7b4f93684efe0d5d84794073f51aa029ccef1bd9749eb44` |
| Core3 | kanban mobile | `/tmp/core3-recruitment/talent-pools-kanban-mobile-390x844-20260911.png` | 390x844 | `6ec96abefe4b29462bb1ed5c679b05b9025a0f1a3e32e25aa9bf45475fb7ebbc` |
| Core3 | detail mobile | `/tmp/core3-recruitment/talent-pool-detail-mobile-390x844-20260911.png` | 390x844 | `fa2f2ac92168f48ff1a0126cfff760c0a019c8f125c74469387d86f77725cf8e` |
| Core3 | talents mobile | `/tmp/core3-recruitment/talent-pool-talents-mobile-390x844-20260911.png` | 390x844 | `4ba81890c3510aab048aece7cf7ad8d5bd5ff32395704c5020e910cc4ba2a197` |
| Core3 | add-applicant mobile | `/tmp/core3-recruitment/talent-pool-add-applicant-mobile-390x844-20260911.png` | 390x844 | `119ceb07f4d2c92b7b9689cc83a44768b2741086ddc0629beea7f918c0356369` |

The final Core3 browser pass reported zero page errors, zero failed requests,
and `scrollWidth === clientWidth` at 390x844. The add-applicant options were
the stable unpooled applicants Jordan Lee and Riley Morgan. The Core3 visual
residuals are the Fluent shell versus Odoo's purple shell, simpler projected
tag/company/color controls, and the absence of Odoo's chatter, matching-star
widget, and graph/calendar/activity applicant views. The linked-membership
route is canonical Core3 navigation rather than Odoo's runtime-generated
action suffix.

Focused verification from `sdk/bun/sample`:

```text
bun test test/recruitment_talent_pools.integration.test.ts
4 passed, 0 failed, 55 expect calls
bun run audit
UI audit: 476 pages, 483 routes, 829 datasources
bunx eslint test/recruitment_talent_pools.integration.test.ts
passed
git diff --check
passed
```

Deferred: full applicant view-mode parity from the talent-pool action
(graph/calendar/pivot/activity), native many-to-many/tag and color widgets,
CV/chatter/followers, richer applicant/job propagation, and additional
interviewer/company-specific policy variants.

## Batch 5 implementation record — Recruitment Job Boards Emails

The installed Odoo source and authenticated personal reference were inspected
before implementation. Odoo action `action_hr_job_platforms` opens model
`hr.job.platform` from `Recruitment → Configuration → Job Boards → Emails`.
The source list and form use exactly `name`, `email`, and `regex`; `name` and
`email` are required, email is unique and normalized on create/write, and the
model has no job-opening relation. Core3 therefore keeps this batch bounded to
platform email rules; applicant job assignment remains a separate concern.

Core3 adds page id `recruitment-job-platforms` at `/recruitment/emails`, joins
page/API YAML by `page.id`, and exposes a manager-only Configuration menu item.
Migration `20260911200000-007-recruitment-job-platforms.yaml` seeds fixed
Odoo-matching `Linkedin`, `Jobsdb`, and `Indeed` records. The API covers
search, empty/no-result, forbidden/transport, required-field, email-format,
duplicate-email, missing-record, and stale-row states, with guarded
create/update/delete.

### Evidence

| Surface | State | Viewport | Path | SHA-256 |
| --- | --- | --- | --- | --- |
| Odoo | Emails list | 1440×900 | `/tmp/odoo-recruitment-job-boards-emails-desktop-1440x900-20260911.png` | `7f7a4a1c9b8a33ec4d75019fc52ba4a18282526841ecf201634ed1bcf2e1ab47` |
| Core3 | Emails list | 1440×900 | `/tmp/core3-recruitment-job-boards-emails-list-desktop-1440x900-20260911.png` | `b6652908dde48ea77543e57d1e6b62d4d65d1290f6cc0eeaf9f39410d46a8ad3` |
| Odoo | Email form | 1440×900 | `/tmp/odoo-recruitment-job-boards-email-form-desktop-1440x900-20260911.png` | `26c86a3fe6497f1f341bebc108657974ac80c3b98efe7df2ae85530a8195ff4d` |
| Core3 | New email form | 1440×900 | `/tmp/core3-recruitment-job-boards-email-form-desktop-1440x900-20260911.png` | `d8c7fad5d1651d663f2d55c0ae06e09c5f85a399bd85da9db2c414e455aa2b4b` |
| Odoo | Emails list | 390×844 | `/tmp/odoo-recruitment-job-boards-emails-mobile-390x844-20260911.png` | `2de8cd8d468e24088bf6cf5a1d38fb63e2855ca74ddfa0ed432012d049295938` |
| Core3 | Emails list | 390×844 | `/tmp/core3-recruitment-job-boards-emails-list-mobile-390x844-20260911.png` | `f7cfd9fe521e28b5c7ac9320e27fd914e5eee71bd9768a498aefd451cd629f97` |
| Odoo | Email form | 390×844 | `/tmp/odoo-recruitment-job-boards-email-form-mobile-390x844-20260911.png` | `2b5510d8648ca26084e7931cf67921e87cdd86c37f584804d7d795f70638d8ed` |
| Core3 | New email form | 390×844 | `/tmp/core3-recruitment-job-boards-email-form-mobile-390x844-20260911.png` | `36928044eab33f6379605333ed9ab51c1950e4788c67ecd2b873636d39d77ad9` |

Authenticated Core3 captures were taken from the isolated runtime. The list
matches the Odoo fields and fixed values, and Regex is intentionally hidden
on the 390px list for responsive fit. Browser checks found no failed requests,
page errors, clipping, or horizontal overflow. Residuals are the shared Core3
Fluent/blue shell versus Odoo's purple shell, Core3 breadcrumb/search-shell
composition, and Core3's mobile modal form versus Odoo's full-page form.

### Verification and commits

- `bun test test/recruitment_job_platforms.integration.test.ts` — 3 passed, 0 failed, 36 assertions.
- `bun run audit` — passed: 482 pages, 489 routes, 838 datasources.
- `bunx eslint sample/test/recruitment_job_platforms.integration.test.ts` — passed.
- `bun run css:build:global` and `bun run css:build:recruitment` — passed.
- `git diff --check` — passed.

Commits: `4449a7c9` implementation, `dc290ba8` portable email-validation fix.
Screenshots remain outside Git. Deferred: mail-template integration, inbound
email execution, applicant auto-creation, and any job-opening-specific
platform relation not present in the installed Odoo model.

## Batch 6 implementation record — Recruitment Settings

The installed Odoo source and authenticated personal reference were inspected
before implementation. Odoo places Settings under `Recruitment → Configuration`
and restricts the menu action to `base.group_system`; the settings app itself
shows a manager-visible Recruitment tab. The tab contains exactly three
checkbox settings: `Online Posting` under `Job Posting`, `Send Interview
Survey` under `Process`, and `Résumé Digitization (OCR)` under `In-App
Purchases`. `Send SMS` is an informational setting without a checkbox. In the
personal reference all three optional-module checkboxes were enabled controls
and initially unchecked; OCR displayed the `Enterprise` marker. Checking a
module marks the form as having unsaved changes; Save persists/installs the
module setting and Discard restores the loaded values.

Core3 adds page id `recruitment-settings` at `/recruitment/settings`, a
system-equivalent `recruitment.settings` permission, the shared SettingsView,
page.id-owned API/action YAML, and a fixed singleton fixture. The API covers
valid saves, invalid boolean values, stale-row conflicts, missing records,
empty/not-found, unauthorized, forbidden, and transport-error states. No
module installation is performed by the YAML fixture; the three booleans are
the bounded UI contract.

### Evidence

| Surface | State | Viewport | Path | SHA-256 |
| --- | --- | --- | --- | --- |
| Odoo | Recruitment settings | 1440×900 | `/tmp/odoo-recruitment-settings-1440x900-20260911.png` | `17541351ebeb78142fc03640c77b6b3f07f287d3c2fab3af13eef5c569548f67` |
| Core3 | Recruitment settings | 1440×900 | `/tmp/core3-recruitment-settings-1440x900-20260911.png` | `e290c405c008fef20927501eea32edafc9dc365bd0cdb47c074e67c2be0fc0e0` |
| Odoo | Recruitment settings | 390×844 | `/tmp/odoo-recruitment-settings-390x844-20260911.png` | `a79bf5ac51c4fee8180e7143b28262d586814270aaa73df8cd12405438925958` |
| Core3 | Recruitment settings | 390×844 | `/tmp/core3-recruitment-settings-390x844-20260911.png` | `3e46175278d7e49ae59784e9209045352b9dcb89b0a890579a649d5bf458e3cb` |

Authenticated captures were inspected as Odoo/Core3 pairs at both target
viewports. Core3 matches the three section headings, labels, descriptions,
checkbox placement, Enterprise marker, fixed toolbar, vertical tab, and
content-only scrolling. The browser matrix reported zero failed responses,
zero page errors, and exact document/body widths of 1440/1440 and 390/390.
The intentional visual residuals are Core3's Fluent/blue application shell
versus Odoo's purple shell, the compact Core3 mobile shell/header, and simpler
icons/checkbox styling. Screenshots remain outside Git.

### Verification and commits

- `bun test test/recruitment_settings.integration.test.ts` — 4 passed, 0 failed, 28 assertions.
- `bun run audit` — pending final handoff run in this worktree.
- `bunx eslint test/recruitment_settings.integration.test.ts` — pending final handoff run in this worktree.
- `bun run css:build:global` and `bun run css:build:recruitment` — passed.
- `git diff --check` — passed before implementation commit.

Commit: `e1e03b17` implementation. The additive shared SettingsView Enterprise
badge support is included in that implementation commit; no separate fix was
needed after browser verification. Deferred: real Odoo module installation,
module-specific post-install screens, Website Recruitment/Survey/OCR feature
workflows, and non-system permission administration.
