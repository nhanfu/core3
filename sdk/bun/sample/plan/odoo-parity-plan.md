# Odoo 19 parity — module register and full functionality

## Scope

Clone the Odoo 19 Community experience in Core3, module by module and menu by
menu, including the backend behavior behind every visible feature. UI parity is
not sufficient: each module must provide real persistence, service/API
contracts, CRUD, state transitions, permissions, workflows, and relevant
notifications, attachments, imports/exports, reports, and integrations.
Deterministic YAML seed data remains required for repeatable tests, but it is not
a substitute for production functionality.

Website Builder, Forum, Blog, eCommerce, and other composition-oriented modules
must use the approved Core3 declarative/runtime architecture; they are not
exempt from functional parity or allowed to remain fixture-only.
frontend code is not copied.

## Binding fidelity contract

This is a strict UI/UX parity project. For every module, implementation MUST
follow the Odoo menu tree first and build screens only after the complete visible
menu, submenu, action, permission, and ordering inventory has been recorded.
No screen may be added as an isolated approximation or placed in a different
menu merely because it is convenient for Core3 routing. Any unavoidable route
difference must be explicitly documented as a deliberate alias or redirect.

For every Odoo screen, the implementation MUST reproduce the observed layout
hierarchy and visual language: page frame, toolbar, content widths, colors,
backgrounds, borders, radii, typography, spacing, responsive breakpoints, tabs,
sections, section ordering, component types, labels, helper text, empty states,
and action placement. Visible text must match Odoo exactly, including menu
labels, tab labels, section headings, field labels, button labels, status text,
placeholders, and explanatory copy, except where a documented localization or
Core3 security constraint requires a difference.

ListView view-mode navigation MUST use visible text tabs (for example List,
Kanban, Pivot, Graph, or Calendar) and MUST NOT use icon-only navigation. This
rule applies even where an icon-navigation implementation already exists; such
navigation must be replaced or disabled for parity work. Icons may remain as
decorative or supplementary controls, but they must not be the sole way to
change a view or discover a screen.

Each screen is accepted only after authenticated desktop and mobile headless
browser captures have been compared with the corresponding Odoo screen. The
comparison must check menu location and labels, layout geometry, color and
spacing tokens, tabs, sections, component and text parity, responsive behavior,
and all visible interactive states. A module is not ready when its screens work
but its menu structure or visual/UX details remain approximate.

## Technical implementation notes

- Render HTML through the Core3 Fluent API in `html.js`. Prefer fluent
  composition and registered Core3 components over hand-built HTML strings,
  ad-hoc DOM mutation, or bespoke page markup. Keep page structure and
  behavior declarative in YAML; use the Fluent API only at the renderer seam
  where HTML must be produced.
- During development mode, module migrations may be consolidated into exactly
  two module-owned files: `schema.yaml` for tables, indexes, constraints, and
  schema changes, and `demo.yaml` for deterministic demo/fixture data. Both
  files must remain idempotent and rerunnable on a clean database and an
  existing development database. This consolidation is safe only for
  unreleased development migrations; once a release or shared environment has
  consumed a migration, preserve its history and add a new migration instead
  of rewriting it.
- Use the Temporal workflow engine for any workflow that must be durable across
  restarts, spans multiple Core3 modules, or integrates with a third-party
  system. This includes long-running steps, timers, human approval waits,
  retries, callbacks, and external side effects. Module-local synchronous state
  transitions may remain Core3/YAML workflows. YAML must still declare the
  workflow identity, permissions, inputs, outputs, and transition contract;
  Temporal owns durable execution, retry policy, timeout handling, and recovery.
  Every Temporal activity must be permission-checked, idempotent, observable,
  and provide an explicit failure or compensation path.
- Core3 uses Bun for the Temporal client and Worker during development and
  deployment. Temporal's TypeScript Worker support is officially centered on
  Node, so Bun compatibility is a Core3 runtime decision and must be verified
  against the pinned SDK version. Each Temporal integration must pass Worker
  startup, workflow start, replay/restart recovery, activity execution, retry,
  signal/timer, and shutdown smoke checks before acceptance. Keep a Node Worker
  fallback documented if a future SDK or Bun change breaks compatibility.

## Live Odoo reference environment

- URL: `http://localhost:8069`
- Database: `core3_reference`
- Login email: `codex@core3.local`
- Login password: use the local QA secret; never print or commit it
- Odoo container: `odoo-core3-reference`
- PostgreSQL container: inspect the container configuration before starting
- Start command: `docker start odoo-core3-reference`
- Stop command: `docker stop odoo-core3-reference`

The former `odoo-core3-user` Odoo container was stopped and retained as
`odoo-core3-user-stopped`; its PostgreSQL container and volumes are preserved
for rollback. The active reference is a separately provisioned Odoo 19 image
with a dedicated PostgreSQL 16 database, a dedicated Odoo data volume, and
official demo data enabled during database creation. New parity captures must
use the active URL and credentials above. Keep credentials out of source code
outside this local parity plan.

The `core3_reference` database has demo-enabled Odoo modules
installed for CRM, Sales, Purchase, Accounting, Inventory, Point of Sale,
Events, Employees, Recruitment, Expenses, Time Off, Timesheets, Project,
Maintenance, Fleet, Manufacturing, Email Marketing, Live Chat, Calendar, and
the related source modules required by those applications. Its verified demo
data includes partners, products, CRM leads, events, sales orders, projects,
expenses, leave records, maintenance requests, fleet vehicles, surveys, POS
catalog records, and manufacturing/inventory records.

## Module register

| Core3 service | Odoo reference addon | Source status | Sub-plan | Status |
| --- | --- | --- | --- | --- |
| base | contacts, base | available | `odoo-ui-parity/base-contacts.md` | in-progress |
| chat | mail | available | `odoo-ui-parity/chat.md` | ready |
| crm | crm | available | `odoo-ui-parity/crm.md` | in-progress |
| order | sale_management | available | `odoo-ui-parity/sales.md` | ready |
| point-of-sale | point_of_sale | available | `odoo-ui-parity/point-of-sale.md` | in-progress |
| sale-subscription | sale_subscription | unavailable in supplied source | `odoo-ui-parity/subscriptions.md` | planned |
| sale-renting | sale_renting | unavailable in supplied source | `odoo-ui-parity/rental.md` | planned |
| accounting | account | available | `odoo-ui-parity/accounting.md` | in-progress |
| expenses | hr_expense | available | `odoo-ui-parity/expenses.md` | in-progress |
| documents | documents | unavailable in supplied source | `odoo-ui-parity/documents.md` | planned |
| approvals | approvals | unavailable in supplied source | `odoo-ui-parity/approvals.md` | planned |
| spreadsheet | spreadsheet | available | `odoo-ui-parity/spreadsheet.md` | ready |
| inventory | stock | available | `odoo-ui-parity/inventory.md` | in-progress |
| manufacturing | mrp | available | `odoo-ui-parity/manufacturing.md` | in-progress |
| purchase | purchase | available | `odoo-ui-parity/purchase.md` | in-progress |
| maintenance | maintenance | available | `odoo-ui-parity/maintenance.md` | ready |
| field-service | industry_fsm | unavailable in supplied source | `odoo-ui-parity/field-service.md` | planned |
| helpdesk | helpdesk | unavailable in supplied source | `odoo-ui-parity/helpdesk.md` | planned |
| quality | quality | unavailable in supplied source | `odoo-ui-parity/quality.md` | planned |
| plm | mrp_plm | unavailable in supplied source | `odoo-ui-parity/plm.md` | planned |
| employees | hr | available | `odoo-ui-parity/employees.md` | in-progress |
| recruitment | hr_recruitment | available | `odoo-ui-parity/recruitment.md` | in-progress |
| time-off | hr_holidays | available | `odoo-ui-parity/time-off.md` | in-progress |
| appraisals | hr_appraisal | unavailable in supplied source | `odoo-ui-parity/appraisals.md` | planned |
| referrals | hr_referral | unavailable in supplied source | `odoo-ui-parity/referrals.md` | planned |
| fleet | fleet | available | `odoo-ui-parity/fleet.md` | in-progress |
| email-marketing | mass_mailing | available | `odoo-ui-parity/email-marketing.md` | in-progress |
| sms-marketing | mass_mailing_sms | available | `odoo-ui-parity/sms-marketing.md` | in-progress |
| events | event | available | `odoo-ui-parity/events.md` | in-progress |
| surveys | survey | available | `odoo-ui-parity/surveys.md` | in-progress |
| marketing-automation | marketing_automation | unavailable in supplied source | `odoo-ui-parity/marketing-automation.md` | planned |
| project | project | available | `odoo-ui-parity/project.md` | in-progress |
| timesheets | hr_timesheet | available | `odoo-ui-parity/timesheets.md` | in-progress |
| website | website | available; YAML-driven | `odoo-ui-parity/website.md` | in-progress |
| ecommerce | website_sale | available; YAML-driven | `odoo-ui-parity/ecommerce.md` | in-progress |
| blog | website_blog | available; YAML-driven | `odoo-ui-parity/blog.md` | in-progress |
| forum | website_forum | available; YAML-driven | `odoo-ui-parity/forum.md` | in-progress |
| livechat | im_livechat | available | `odoo-ui-parity/livechat.md` | in-progress |

`auth` and `ai` are Core3 infrastructure, not Odoo-clone modules, and are outside
this register.

## Required analysis and acceptance gate for every sub-plan

1. Record the exact Odoo menu tree first: application, menu, submenu, action,
   ordering, visibility groups, route/action context, and every screen reached
   from each visible entry.
2. Record the Odoo addon/version and whether its manifest provides official demo
   data.
3. Enumerate every visible menu, action, and view state.
4. Break the module into functional areas and small checklist items. Give every
   item a stable ID and record its Odoo menu/action, user goal, inputs, outputs,
   state transitions, permissions, persistence, integrations, and expected
   desktop/mobile behavior. Include items for hidden, empty, error, modal,
   report, import/export, and workflow states where applicable.
5. Inspect the current Core3 source for every checklist item before cloning.
   Search the existing manifests, pages, YAML API/action contracts, services,
   migrations, components, routes, styles, tests, and seed data. Record exact
   source paths and classify each item as `implemented`, `partial`, `missing`,
   or `incompatible` with Odoo.
6. Create a gap matrix mapping each Odoo functionality to the current Core3
   implementation, missing behavior, required change, dependency, and planned
   test/evidence case. The matrix is the source of truth for the clone scope;
   do not reimplement functionality that already satisfies the comparison.
7. Identify Odoo screenshots/routes at desktop and mobile viewports.
8. Declare deterministic Core3 YAML seed data and the real backend datasource
   contract for every list, form, kanban, calendar, chart, report, pivot,
   dashboard, and empty state shown by the module. Tests may use the seed
   provider, but accepted runtime behavior must use real service queries and
   mutations without changing the page-layout YAML contract.
9. Specify the exact screen layout, colors, spacing, tabs, sections, components,
   and visible text to be matched, including the ListView tab-navigation rule.
10. Identify shared UI primitives required by the module; do not implement new
   primitives before recording them here.
11. Define visual, menu-order, responsive, interaction, permission, and
   fixture-data acceptance checks, including the required headless comparison.

Only after the Odoo inventory, functionality checklist, current-source
comparison, gap matrix, and acceptance checks are written does cloning or
development begin.

The shared mock-data contract is defined in
`odoo-ui-parity/screen-mock-data.md` and applies to every module sub-plan.

## Single-agent module lifecycle

Each registered module has exactly one persistent developer agent. That agent
owns the complete module goal from Odoo analysis through implementation,
testing, verification, evidence capture, repair, and sign-off. There are no
separate developer, QA, reviewer, or merge-agent roles for a module, and no
feature-slice agents may be created.

The main agent may dispatch work and integrate completed module changes, but it
does not create another role for analysis, testing, review, screenshots, or
repairs. A stopped module agent resumes the same worktree and context; it is
not replaced by a new agent.

Before implementation, the module developer MUST create or update the
module-specific verification plan at
`odoo-ui-parity/qa/test-plans/<module>.md`, using
`odoo-ui-parity/qa/test-plans/_template.md`. This is a developer-owned test
plan, not a handoff to another role.

Each module test plan must be a module-specific checklist derived from the Odoo
functionality checklist and Core3 gap matrix. It must include concrete case
IDs, setup data,
actor/permission boundary, exact action or route, expected result, persistence
assertion, and required evidence. At minimum, the developer must cover:

- every menu, submenu, action, view mode, visible tab, search/filter/group,
  sort, pagination, empty state, loading state, error state, and responsive
  breakpoint;
- list, kanban, form, calendar, pivot, graph, dashboard, report, wizard, and
  modal states wherever the Odoo screen exposes them;
- create, read, edit, duplicate, archive/unarchive, delete, bulk action,
  import/export, attachment, chatter/message, notification, and report/print
  behavior where applicable;
- required fields, field types, defaults, computed/related fields, invalid
  values, boundary values, duplicate values, missing records, stale row
  versions, retries, and partial-failure behavior;
- every declared workflow transition, forbidden transition, cancellation,
  approval/rejection, reopen/reset path, scheduled/timer path, and resulting
  side effects on related records;
- admin, manager, ordinary user, cross-company, branch/scope, and
  unauthenticated/unauthorized behavior, including hidden actions and direct
  API enforcement;
- database persistence after reload and restart, idempotent seed/migration
  behavior, transaction/rollback integrity, row-version/concurrency behavior,
  and cross-module contract effects;
- third-party, email, payment, webhook, file, external API, and durable
  workflow behavior where applicable, including retry, timeout, compensation,
  recovery, and audit history;
- authenticated Odoo/Core3 comparison at desktop and mobile for normal,
  detail, create/edit, modal/wizard, empty, error, permission, and each major
  workflow state.

Each case is classified as `functional`, `data`, `permission`, `workflow`,
`integration`, `visual`, `responsive`, `security`, or `regression`. The module
developer cannot sign off while a required case is unplanned, unexecuted, or
marked pass without evidence.

## Required feature-by-feature development loop

The module developer MUST execute the following loop for every smallest
feature/checklist item, not once for the module as a whole. A feature may be a
single action, field group, view mode, workflow transition, modal, report,
import/export path, permission boundary, or responsive state. Do not combine
unrelated checklist items into one untraceable implementation batch.

For each feature ID:

1. Select the smallest unfinished checklist item and link it to its Odoo
   menu/action, source-comparison row, gap-matrix row, test cases, and evidence
   folder.
2. Re-analyze the exact Odoo behavior immediately before development. Record
   every label, tooltip, placeholder, default, field type, required rule,
   validation message, button state, keyboard/mouse interaction, loading state,
   empty state, error state, notification, modal, navigation result, workflow
   transition, permission boundary, and desktop/mobile difference.
3. Re-check the current Core3 source for that feature and identify the exact
   files, contracts, components, queries, mutations, migrations, styles, tests,
   and shared primitives to reuse or change. Record why each existing behavior
   is sufficient, partial, or unsafe to reuse.
4. Write the feature acceptance checklist before coding. It must cover backend
   persistence and API behavior, UI structure and text, valid and invalid
   inputs, boundary and missing-data cases, permissions, workflow side effects,
   responsive states, and regression impact on already completed features.
5. Clone the Odoo behavior in the required order: data/schema and migrations,
   service/API/action contracts, permissions and workflows, then declarative
   page/UI behavior and styling. Keep the feature ID in relevant commits,
   tests, progress entries, and evidence names.
6. Test the feature at its smallest useful boundary: focused unit or contract
   tests, datasource/API tests, persistence and reload/restart checks, CRUD and
   permission checks, workflow/error cases, and affected regression tests.
7. Verify the actual authenticated Odoo and Core3 browser behavior at desktop
   and mobile sizes. Exercise the feature through its real menu, route, form,
   modal, notification, and workflow transitions; do not treat YAML parsing,
   API-only calls, or static screenshots as feature completion.
8. Capture the complete feature evidence, including before/after comparison
   screenshots, test output, browser console/trace output when relevant, and
   API/database assertions. Store it under
   `odoo-ui-parity/evidence/<module>/<YYYY-MM-DD>/<feature-id>/`.
9. Repair every mismatch or failed case, repeat testing and browser
   verification, and update the feature evidence rather than merely recording
   an unresolved pass.
10. Mark the feature complete only when every checklist item has a result and
    evidence path. Then start the next feature. If a shared primitive or
    contract changes, re-run all previously completed feature checks affected
    by that change.

The developer must keep the feature checklist, source comparison, test result,
verification result, repair history, and evidence linked by the same stable
feature ID. A module cannot be signed off while any feature is only partially
implemented, verified through a bypass, or missing its detail-level evidence.

## Shared agent contribution rules

- To run one module quickly without Bun's recursive file watcher, use
  `bun run agent:module -- <module>` from `sdk/bun/sample` (for example,
  `bun run agent:module -- inventory --port=4000`). The runner uses the built
  frontend, in-memory DuckDB, and loads the requested module plus `auth` for
  session/login support. File watching is disabled; restart it manually after
  source changes.
- There are exactly 38 persistent module developers: one agent for every
  actual module row in the module register. The module count is derived from
  this plan, not multiplied into QA, review, or merge roles. The scheduler may
  run as many module developers concurrently as the active goal permits,
  subject to the global worker limit. `auth` and `ai` are excluded because
  they are Core3 infrastructure, not registered Odoo modules.
- A module developer receives the complete module goal, not a short UI slice.
  It remains responsible for Odoo analysis, menu/action inventory, domain
  model and migrations, APIs/services, permissions, workflows, UI, seeded
  data, CRUD, regression tests, authenticated browser proof, visual comparison,
  evidence capture, and repairs until parity is signed off or an exact source
  blocker is recorded. Do not respawn or rotate the developer for retries,
  screenshots, or bug fixes.
- A module developer's assignment, worktree, branch, ledger, and implementation
  context are durable, but its process does not need to remain active. The
  main agent dispatches bounded lifecycle tasks to the same developer and
  resumes context from the module plan, progress file, commits, evidence, and
  open findings. Do not create a new agent for each lifecycle event or feature
  slice.
- Worktrees are isolated from the active checkout. Owners commit only their
  module changes and never merge, cherry-pick, or edit another module's
  worktree. Cross-module contracts and dependencies are documented for the
  main agent to integrate in dependency order.
- The main agent maintains the dispatch registry and integrates completed
  module changes. It dispatches only to the existing module developer and does
  not create a second role for testing, review, merge, screenshots, or repairs.
- Do not create fresh replacement agents. If an owner stops, the main agent
  resumes that same run/worktree or records a blocker and requests explicit
  direction; ownership remains stable for the lifetime of this plan.
- Each module developer follows the same sequence:
  `odoo-analysis -> functionality-checklist -> source-comparison -> gap-matrix
  -> verification-plan -> feature-loop -> clone -> development -> test -> verify
  -> evidence -> repair -> developer-sign-off`. The feature loop repeats the
  clone/development/test/verify/evidence cycle for every smallest checklist
  item. A module may not skip the current-source comparison and begin cloning
  or developing in Core3.
- Lifecycle events are dispatched to the same developer. Typical triggers are
  `analysis-ready`, `clone-ready`, `feature-complete`, `verification-failed`,
  `refactor-impact`, and `release`. The developer records the trigger, current
  commit, test-plan path, and evidence path in its module progress file.
- `odoo-ui-parity/progress.md` is the aggregate sign-off ledger. Each module
  developer owns and may update only its module progress file, following
  `odoo-ui-parity/progress/README.md`, its verification ledger, and its
  evidence folder. The main agent may consolidate verified module results into
  `progress.md` during integration. Intermediate commits and failing attempts
  belong in the matching module ledger.
- Every completed module must have corresponding test-case entries, developer
  test results, authenticated browser verification, and evidence paths before
  its progress row can say parity-signed-off. A source blocker may be recorded
  only with the exact missing addon/action evidence; it is not a visual parity
  sign-off.
- CRUD screens must use `FormView` for create and edit flows. Avoid bespoke or
  ugly CRUD modals. If a modal is required by the Odoo interaction, define the
  modal as a YAML-managed form contract and render it through `FormView`, so
  its fields, validation, permissions, and actions remain declarative and
  maintainable.

## Shared verification and evidence ledger

The module-level plan files describe Odoo behavior and implementation scope.
Each module has its own developer-owned execution ledger at
`odoo-ui-parity/qa/<module>.md`, with separate test-case and bug-fix tables.
The aggregate progress file tracks only cross-module status:

- `odoo-ui-parity/qa/<module>.md` is the canonical module verification and
  repair ledger. It records the Odoo route/action, Core3 route, fixture/state,
  verification trigger, desktop/mobile capture paths, test result, observed
  mismatch, evidence, developer, fix commit, regression test, retest result,
  and blocker.

The module developer must update its ledger as part of every test and
verification pass. Do not combine module histories into one file. Evidence is
stored under
`odoo-ui-parity/evidence/<module>/<YYYY-MM-DD>/<feature-id>/` and must not be
left only in `/tmp`. Each module date folder must also contain an index linking
all feature IDs to their evidence folders. Each feature evidence folder must
contain at least `README.md`,
`odoo-analysis.md`, `functionality-checklist.md`, `source-comparison.md`,
`gap-matrix.md`, `test-results.md`, and `verification.md`, plus the relevant
menu/action inventory, API or database assertions, permission results, desktop
and mobile screenshots, browser traces, or console logs. `README.md` maps each
artifact to a verification case and records omitted artifacts with an exact
reason. Never store passwords, tokens, or other secrets in evidence.

Evidence artifacts are part of the module's completion record and may be
committed with the module changes. Large or sensitive artifacts must be
redacted or referenced by a reproducible local path with the reason recorded in
the evidence README; a screenshot may not be claimed as captured when it is
missing from the evidence folder.

## Persistent ownership and completion lifecycle

Every registered module follows this lifecycle with the same owner:

`Odoo feature analysis -> functionality checklist -> current-source comparison -> gap matrix -> clone design -> development -> domain/data/migrations -> service/API/permissions -> workflows -> UI -> CRUD/permission tests -> authenticated desktop/mobile comparison -> evidence capture -> repair and regression -> developer sign-off -> main-agent integration`.

The main agent maintains the dispatch-facing ownership registry with module,
branch, worktree, run id, dependencies, latest commit, and current lifecycle
step. A module is complete only when its functionality and UI are both
accepted by the module developer's recorded tests and evidence; a missing
upstream Odoo addon is a blocker with exact evidence, never an implicit
fixture-only success.

## Main-agent dispatch protocol

1. Select the next ready module or lifecycle event from the registry and
   dispatch it to that module's existing developer.
2. Include the module id, worktree/process, dependency status, lifecycle step,
   latest commit, exact test-plan path, evidence-folder path, and expected
   output in every task.
3. Consume the developer's recorded results and dispatch the next lifecycle
   step or an explicit repair to the same developer. Do not create parallel
   role handoffs for one module.
4. Integrate a module only after its developer has recorded all required tests,
   authenticated Odoo/Core3 verification, evidence paths, and sign-off.
5. Keep concurrent work within the active global worker limit; the number of
   workers is the number of active module developers, not a multiplier for
   testing, review, or merge roles.
