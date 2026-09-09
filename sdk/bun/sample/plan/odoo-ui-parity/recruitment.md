# Odoo 19 UI parity — Recruitment

Status: `ready`

This is a plan-only implementation gate. It authorizes a later recruitment
implementation batch; it does not change product code, install Odoo modules,
or treat an uninstalled reference addon as visual evidence.

## Reference gate and exact limitation

- Odoo source is `/home/nhanjs/projects/odoo`, revision
  `659759969d535d286b656c96b675e4612b925ddd` (`65975996`), addon
  `addons/hr_recruitment`.
- The authenticated reference is `http://localhost:8069`, database
  `core3_demo`, checked on 2026-09-10 as `admin@core3.local` using the
  credentials in the parent register. Login succeeds and the Odoo shell is
  `19.0-20260908`.
- `hr_recruitment` is not installed in that database: the home launcher has no
  Recruitment menu, while `/odoo/apps` shows Recruitment with an `Activate`
  control. No Recruitment `ir.ui.menu`, installed action, loaded view, or
  demo record is therefore available for authenticated live inspection. The
  addon must not be activated as part of this plan.
- Truthful fallback captures are under `/tmp` only:
  `/tmp/odoo-recruitment-desktop.png` (1440x900 logged-in Discuss shell) and
  `/tmp/odoo-recruitment-mobile.png` (390x844 logged-in Discuss shell), plus
  `/tmp/odoo-recruitment-menu-desktop.png` (1440x900 launcher showing that
  Recruitment is absent). These are explicitly Discuss/uninstalled captures,
  not Recruitment parity screenshots. There is no installed-addon desktop or
  mobile Recruitment screenshot and no screenshot is fabricated or committed.
- Because the addon is uninstalled, installed-reference route resolution,
  rendered menu/action/view assertions, live fixture inspection, and visual
  comparison remain follow-up evidence. The source inventory and Core3
  contract below are still complete enough to authorize implementation once
  that reference prerequisite is restored.

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

Completed for this plan-only gate: source manifest, menu/action/view,
security, demo-data and Core3 service inspection; authenticated desktop and
mobile login; authenticated launcher/apps-catalog check proving Recruitment is
uninstalled; truthful fallback captures under `/tmp`; and source revision
verification. Product implementation, module installation, and binary commit
are out of scope.

Run from `sdk/bun/sample` after implementation:

```sh
bun run audit
bun run audit:yaml
git diff --check
```

Also run the focused recruitment migration/API/schema tests and the complete
authenticated desktop/mobile Playwright matrix described above. This plan is
ready because all six register gates are recorded with evidence or an exact
reference limitation; installed-addon visual sign-off is an explicit
prerequisite before claiming UI parity.
