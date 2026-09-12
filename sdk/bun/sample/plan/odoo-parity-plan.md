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

## Required gate for every sub-plan

1. Record the exact Odoo menu tree first: application, menu, submenu, action,
   ordering, visibility groups, route/action context, and every screen reached
   from each visible entry.
2. Record the Odoo addon/version and whether its manifest provides official demo
   data.
3. Enumerate every visible menu, action, and view state.
4. Identify Odoo screenshots/routes at desktop and mobile viewports.
5. Declare deterministic Core3 YAML seed data and the real backend datasource
   contract for every list, form, kanban, calendar, chart, report, pivot,
   dashboard, and empty state shown by the module. Tests may use the seed
   provider, but accepted runtime behavior must use real service queries and
   mutations without changing the page-layout YAML contract.
6. Specify the exact screen layout, colors, spacing, tabs, sections, components,
   and visible text to be matched, including the ListView tab-navigation rule.
7. Identify shared UI primitives required by the module; do not implement new
   primitives before recording them here.
8. Define visual, menu-order, responsive, interaction, permission, and
   fixture-data acceptance checks, including the required headless comparison.

Only after all eight are written does implementation begin.

The shared mock-data contract is defined in
`odoo-ui-parity/screen-mock-data.md` and applies to every module sub-plan.

## Shared agent contribution rules

- To run one module quickly without Bun's recursive file watcher, use
  `bun run agent:module -- <module>` from `sdk/bun/sample` (for example,
  `bun run agent:module -- inventory --port=4000`). The runner uses the built
  frontend, in-memory DuckDB, and loads the requested module plus `auth` for
  session/login support. File watching is disabled; restart it manually after
  source changes.
- There are exactly 38 persistent module owners: one Luna medium-effort
  sub-agent for every actual module row in the module register. A logical wave
  contains 9 module owners and 3 QA owners, with each QA owner responsible for
  3 modules. The main agent schedules those 12 workers as a wave; the main
  agent is the 13th coordinator and does not count as a module or QA owner.
  `auth` and `ai` are excluded because they are Core3 infrastructure, not
  registered Odoo modules.
- A module owner receives the complete module goal, not a short UI slice. It
  remains responsible for menu/action inventory, domain model and migrations,
  APIs/services, permissions, workflows, UI, seeded data, CRUD, regression
  tests, authenticated browser proof, and visual comparison until parity is
  signed off or an exact source blocker is recorded. Do not respawn or rotate
  owners for slices, retries, screenshots, or bug fixes.
- A module owner's assignment, worktree, branch, ledger, and implementation
  context are durable, but its process does not need to remain active. The
  main agent dispatches bounded implementation, repair, regression, or evidence
  tasks to the same module owner and resumes context from the module plan,
  progress file, commits, and open findings. Do not create a new durable
  developer agent for each event or feature slice.
- Worktrees are isolated from the active checkout. Owners commit only their
  module changes and never merge, cherry-pick, or edit another module's
  worktree. Cross-module contracts and dependencies are documented for the
  main agent to integrate in dependency order.
- The main agent is the sole manager and integration gate: it reviews every
  commit and diff, checks ownership boundaries and warnings, runs targeted and
  shared tests, audits routes/contracts, verifies authenticated Odoo/Core3
  browser evidence, and cherry-picks or merges only validated commits into the
  active branch. A commit is not accepted based on an agent's claim alone.
- Do not create fresh replacement agents. If an owner stops, the main agent
  resumes that same run/worktree or records a blocker and requests explicit
  direction; ownership remains stable for the lifetime of this plan.
- Use 3 dispatchable QA slots for each logical wave, with each QA assignment
  covering up to 3 module owners. QA does not require a durable active goal or
  continuously running session. The module assignment, ledger, and current
  state are durable; each verification event creates a bounded QA task that the
  main agent can dispatch to an available QA slot. The QA task ends after
  recording sign-off or a blocker. QA agents consume committed developer work,
  test the Core3 process/worktree spawned by the corresponding developer, run
  the functional and authenticated Odoo/Core3 browser matrix, and re-test
  fixes. Each module's results, failures, and repairs are recorded in
  `odoo-ui-parity/qa/<module>.md`. Module agents must respond to their assigned
  QA findings and keep ownership until QA signs off or the blocker is
  explicitly recorded.
- QA triggers are `feature-complete`, `merge-candidate`, `post-merge`,
  `refactor-impact`, and `release`. The module owner records the trigger and
  candidate commit in its module progress file; the main agent creates a
  bounded event task and dispatches it to an available QA slot in the
  background. The QA slot acknowledges the event, runs the required checks
  against the committed candidate, updates the module QA ledger, and closes
  the task. No QA slot continuously polls or starts a duplicate Core3 process
  while idle.
- `odoo-ui-parity/progress.md` is the QA-maintained aggregate and sign-off
  ledger. Module agents must not edit it directly. Each module agent
  owns and may update only `odoo-ui-parity/progress/<module>.md`, following
  `odoo-ui-parity/progress/README.md`. The assigned QA owners consolidate
  verified module results into `progress.md` after verification. Intermediate
  commits and failing attempts belong in the matching module QA ledger.
- Every completed module must have corresponding test-case entries and a
  tester result before its progress row can say parity-signed-off. A source
  blocker may be recorded only with the exact missing addon/action evidence;
  it is not a visual parity sign-off.
- CRUD screens must use `FormView` for create and edit flows. Avoid bespoke or
  ugly CRUD modals. If a modal is required by the Odoo interaction, define the
  modal as a YAML-managed form contract and render it through `FormView`, so
  its fields, validation, permissions, and actions remain declarative and
  maintainable.

## Shared verification and repair ledger

The module-level plan files describe Odoo behavior and implementation scope.
Each module has its own execution ledger at
`odoo-ui-parity/qa/<module>.md`, with separate test-case and bug-fix tables.
The aggregate progress file tracks only cross-module status:

- `odoo-ui-parity/qa/<module>.md` is the canonical QA and repair ledger for
  that module. It records the Odoo route/action, Core3 route, fixture/state,
  verification trigger, desktop/mobile capture paths, test result, observed
  mismatch, evidence, owner, fix commit, regression test, retest result, and
  blocker.

The assigned QA owner must update the relevant module ledger as part of every
verification pass. Do not combine module QA histories into one file. Module
agents may update only their own progress and QA files; QA agents may update
only the QA ledgers for their assigned modules. No agent may edit the
aggregate `progress.md` directly.
Screenshots remain temporary under `/tmp/core3-odoo-parity/` and must never be
added to Git.

## Persistent ownership and completion lifecycle

Every registered module follows this lifecycle with the same owner:

`inventory -> domain/data/migrations -> service/API/permissions -> workflows -> UI -> CRUD/permission tests -> authenticated desktop/mobile comparison -> owner sign-off -> main-agent review -> cherry-pick/merge`.

The main agent maintains the ownership registry with module, branch, worktree,
run id, dependencies, latest commit, test evidence, browser capture directory,
status, and blocker. A module is complete only when its functionality and UI
are both accepted; a missing upstream Odoo addon is a blocker with exact
evidence, never an implicit fixture-only success.

## Main-agent merge protocol

1. Confirm the owner changed only its assigned module and its own progress file.
2. Review the diff and commit history for YAML contracts, migrations, runtime
   warnings, permissions, tests, and dependency declarations.
3. Reproduce focused tests and run `git diff --check` plus the relevant shared
   audit.
4. Verify authenticated Odoo and Core3 desktop/mobile evidence, including CRUD
   and permission boundaries, with captures kept outside Git.
5. Cherry-pick or merge the validated commit, resolve conflicts in the main
   checkout, and update the shared QA/progress ledgers.
6. Send concrete repair findings back to the same owner; never open a new agent
   to replace it.
