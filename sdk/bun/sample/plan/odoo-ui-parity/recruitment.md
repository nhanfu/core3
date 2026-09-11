# Odoo 19 UI parity — Recruitment

Status: `batch-4-implemented`

This document remains the implementation gate and evidence record. Batch 1
implements the coherent Core3 job-position/openings and applicant queues,
including list/kanban/detail/filter/workflow states. Batch 2 adds the
Recruitment Analysis graph/pivot action with deterministic report fixtures,
search filters, and explicit empty/failed datasource states. Batch 4 adds the
bounded Talent Pools list/kanban/form and applicant-membership action.

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
