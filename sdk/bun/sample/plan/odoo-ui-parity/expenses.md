# Expenses UI parity

Status: ready

## Reference gate

- Odoo addon/version: `hr_expense`, Odoo 19 Community (`19.0.2.1` in the live
  database).
- Source manifest: `/home/nhanjs/projects/odoo/addons/hr_expense/__manifest__.py`.
- The addon is an application, depends on `account`, `web_tour`, and `hr`, and
  declares official demo data in `data/hr_expense_demo.xml`.
- Live authenticated check on 2026-09-10: `hr_expense` exists in the
  `core3_demo` database but is `uninstalled`; its live `demo` flag is `false`.
  Therefore the running Odoo UI exposes no Expenses menu, action, record, or
  view state to capture. Do not describe the addon as live-demo-populated until
  the module is installed into a disposable database with demo loading enabled.
- Reference credentials remain outside this plan. The authenticated reference
  URL is `http://localhost:8069`.

## Live routes and evidence

The source-defined Odoo action paths are the routes to capture once the addon is
installed. The current live checks against each route are recorded below so a
future capture can distinguish a real parity reference from the uninstalled
fallback:

| Odoo action | Source path | Expected installed state | Current live result |
| --- | --- | --- | --- |
| My Expenses | `/odoo/expenses` | expense list, default `My Expenses` filter | route remains on the Discuss shell; no Expenses app |
| Expenses to Process | `/odoo/expenses-to-process` | submitted expenses with search panel | redirects/remains on Discuss on desktop; no Expenses app on mobile |
| Expenses Analysis | `/odoo/expenses-analysis` | graph/pivot-first analysis | redirects/remains on Discuss on desktop; no Expenses app on mobile |
| Employee Expenses | `/odoo/expenses-employee` | all employee expenses list | route is not registered while addon is uninstalled |

Current authenticated fallback captures, intentionally kept outside Git:

- Desktop: `/tmp/odoo-expenses-uninstalled-desktop.png`
- Mobile: `/tmp/odoo-expenses-uninstalled-mobile.png`
- App-menu evidence: `/tmp/odoo-expenses-apps.png`

A disposable database `core3_expenses_demo` was then initialized with
`hr_expense` and demo data, using admin credentials `admin` /
`ExpensesDemo2026!`. Authenticated desktop/mobile captures now exist for the
four source routes under `/tmp/odoo-expenses/`; all four loaded with no
unexpected failed requests or mobile overflow. The primary `core3_demo`
database remains unchanged and uninstalled, so the disposable database is the
authoritative implementation reference.

Required implementation-reference captures, to be produced after the addon is
enabled with demo data, are:

- `/tmp/odoo-expenses/my-expenses-desktop.png` and
  `/tmp/odoo-expenses/my-expenses-mobile.png`
- `/tmp/odoo-expenses/expenses-to-process-desktop.png` and
  `/tmp/odoo-expenses/expenses-to-process-mobile.png`
- `/tmp/odoo-expenses/expenses-analysis-desktop.png` and
  `/tmp/odoo-expenses/expenses-analysis-mobile.png`
- `/tmp/odoo-expenses/employee-expenses-desktop.png` and
  `/tmp/odoo-expenses/employee-expenses-mobile.png`
- `/tmp/odoo-expenses/expense-detail-draft-desktop.png` and
  `/tmp/odoo-expenses/expense-detail-draft-mobile.png`
- `/tmp/odoo-expenses/expense-detail-submitted-desktop.png` and
  `/tmp/odoo-expenses/expense-detail-submitted-mobile.png`
- `/tmp/odoo-expenses/expense-categories-desktop.png` and
  `/tmp/odoo-expenses/expense-categories-mobile.png`
- `/tmp/odoo-expenses/settings-desktop.png` and
  `/tmp/odoo-expenses/settings-mobile.png`

Use 1440x900 for desktop and 390x844 with touch emulation for mobile. Capture
the loaded authenticated state, not a direct URL alone; assert the title,
menu, visible records, and absence of failed requests before saving each image.

## Visible menu, action, and view inventory

The following is the complete installed-addon inventory from the Odoo XML
views. Visibility still depends on the named group, so implementation must
exercise both the manager/approver and ordinary employee boundaries.

### Menus

- `Expenses`
  - `My Expenses`
    - `My Expenses` — `hr_expense_actions_my_all`, available to `base.group_user`.
    - `Expenses to Process` — `hr_expense_actions_to_process`, available to
      `base.group_user`.
  - `Reporting`
    - `Expenses Analysis` — `hr_expense_actions_all`, available to
      `base.group_user`.
  - `Configuration`
    - `Expense Categories` — `hr_expense_product`, manager-only.
    - `Settings` — `action_hr_expense_configuration`, system-administrator-only.
- Accounting/Payables integration: `Employee Expenses` —
  `action_hr_expense_account`, available to the Expenses user group. This is a
  second visible entry point to the same employee-expense model and must not be
  lost when Core3 groups the service menu.
- Hidden technical menu: `Activity Types` is `base.group_no_one` and is not part
  of the ordinary user parity surface, but its deliberate hidden status should
  remain documented.

### Window actions and view modes

- `My Expenses` (`hr_expense_actions_my_all`): `list`, `kanban`, `form`,
  `graph`, `pivot`, `activity`; defaults to the current user's open expenses
  and shows the receipt-upload empty state.
- `Expenses to Process` (`hr_expense_actions_to_process`): `list`, `kanban`,
  `form`, `graph`, `pivot`, `activity`; defaults to `submitted` and adds a
  search panel for state, employee, and company.
- `Expenses Analysis` (`hr_expense_actions_all`): `graph`, `pivot`, `list`,
  `form`; defaults to active expense states and has a no-data statistics state.
- `Employee Expenses` (`action_hr_expense_account`): `list`, `kanban`, `form`,
  `pivot`, `graph`; defaults to approved and to-pay filters.
- Department-scoped `Expense to Approve` and `Expense Analysis` actions are
  available from department integrations and must be represented as scoped
  variants or documented redirects, not silently omitted.
- `Expense Categories` (`hr_expense_product`): `list`, `kanban`, `form`,
  filtered to `can_be_expensed` products.
- `Settings` (`action_hr_expense_configuration`): one settings form.

### Record and modal states

- Expense list: receipt/upload affordance, selectable multi-edit rows, optional
  columns, activity indicators, attachments, employee/category/payment mode,
  date, amount, taxes, analytic distribution, company, and status badge.
- Search/filter/group states: free-text expense, department, company, employee;
  My Expenses, My Team, Paid by Company, Paid by Employee, To Submit, Waiting
  Approval, To Post, Waiting Reimbursement, date filter; group by Employee,
  Category, Status, Expense Date, Company, or Department; state/employee/company
  search-panel facets on processing and analysis screens.
- Expense form: draft, submitted, approved, posted, in payment, paid, and
  refused; statusbar visibility changes by state; editable/read-only field
  rules; duplicate-receipt warning; receipt attachment/upload; journal-entry
  stat button; split-expense stat button; chatter/activity and attachments.
- Form actions: Submit, Approve, Post Journal Entries, Refuse, Reset, Split
  Expense, Attach Receipt, open Journal Entry, and open split expense. Buttons
  are state- and permission-dependent.
- Refuse modal: reason field with Refuse/Cancel.
- Duplicate approval modal: explanation plus duplicate expense list and
  Refuse/Approve/Cancel.
- Split-expense modal: editable lines, product/employee/tax/analytic fields,
  total validation warning, Split Expense/Cancel.
- Post-expenses modal: journal and accounting date, Post Expenses/Cancel.
- Expense categories: list, kanban cards, create/edit form, archived ribbon,
  image, cost/unit, reference, note/guideline, sales price, supplier taxes.
- Settings: Incoming Emails and alias/domain state, Reimburse in Payslip,
  Expense Digitalization (OCR), Expense Card, employee expense journal, and
  company-paid payment methods; include the disabled/optional-module states.
- Empty/error/permission states: no expenses, no analysis data, no categories,
  missing receipt, duplicate receipt, invalid split total, denied manager or
  accounting action, and module-not-enabled fallback.

## Existing Core3 surface and parity gap

The existing `expenses` service has:

- `services/expenses/manifest.yaml` with `/expenses` and `/expense-analysis`
  menu entries;
- `services/expenses/storage.yaml`, `permissions.yaml`, and migration
  `20260818100000-001-expenses-foundation.yaml` with `expense_sheets` and
  `expenses` tables;
- `pages/expenses.yaml` with a report list, kanban, pivot, create action, and
  a simplified Draft → Submitted → Approved → Posted → Paid/Refused workflow;
- `pages/analysis.yaml` with two queries, `StatRow`, and `Chart`; and
- `pages/expense-workflow.yaml` with transitions and permissions.

It does not yet have detail-page/API fragments, employee-expense and
to-process routes, activity/calendar/graph states, receipt/attachment
contracts, expense-category/settings surfaces, department scoping, accounting
integration, refusal/duplicate/split/post modals, chatter, or the Odoo
state-specific form contract. Current page YAML also owns its datasource SQL;
the implementation batch must move backend datasource/action definitions to
convention-discovered `services/expenses/api/` fragments keyed by `page.id`.

## Shared primitives

Reuse and verify these existing Core3 contracts before introducing anything
new:

- `ListView` with Odoo variant, optional columns, row actions, bulk selection,
  search, filters, group-by, view tabs, responsive cards, and empty state;
- `OdooFormView` with grouped fields, statusbar, header actions, notebook/tabs,
  attachments, chatter/messages, followers, and read-only/edit transitions;
- `Kanban`, `Pivot`, `Chart`, and `Activity`/calendar-compatible list states;
- `StatusBar`, `StatusChip`, `StatRow`, `SearchPanel`, date-range/filter
  controls, and permission-aware action buttons;
- shared server-form/action mutation contracts, modal/dialog primitives,
  async-select/many2one fields, checkbox/radio/select controls, file upload and
  `OdooAttachmentPanel` contracts;
- `SettingsView` for the Odoo-style settings route, with full-width content and
  only the content area scrolling; and
- shared responsive layout, i18n, error, empty, loading, and access-denied
  primitives.

If a receipt uploader, duplicate-review dialog, split-line editor, or expense
activity renderer is absent from these contracts, record the missing primitive
and its generic API before implementation. Do not create an Expenses-specific
page renderer as a shortcut.

## Deterministic datasource and mock-data contract

Implementation is UI parity only. Every page and state must be fed by a
service-owned deterministic datasource/API fragment; no page-local records,
random IDs, current-time-dependent totals, remote images, or browser-only
fixtures are allowed.

The mock dataset must include stable records covering:

- at least one employee each for ordinary employee, approver/manager, and
  accountant visibility;
- categories for meal, mileage, travel/accommodation, and other, including a
  zero-cost editable category and a fixed-cost quantity category;
- expenses in draft, submitted, approved, posted, in-payment, paid, and refused
  states, with company-paid and employee-paid modes;
- receipts/attachments, no-receipt draft, duplicate receipt candidates,
  analytic distributions, taxes, multiple currencies, departments, companies,
  activities, journal-entry links, and split-expense relationships;
- stable relative-date fixtures using an explicit seeded date, not
  `CURRENT_DATE`, so list ordering, date filters, graph, pivot, and activity
  states are reproducible; and
- empty datasets for each list/category/analysis route and explicit denied
  responses for read, write, manager, accountant, and system settings scopes.

Prefer stable IDs and Odoo-derived semantic names/amounts from
`hr_expense_demo.xml` (Screen, Laptop, Travel by car, Breakfast, Travel by Air,
Hotel Expenses, Lunch with Customer, Lunch, Pizzas, Drinks, Paintball, Chairs,
Lamp, and Car tyres), while keeping the fixture provider replaceable by a real
query later. Add idempotent migrations for tables/fixtures and verify both
fresh install and upgrade paths. Keep receipt binaries local test fixtures or
metadata-only attachments; do not commit screenshots or external assets.

## Implementation route map

Use explicit Core3 routes with aliases only where needed for existing links:

| Core3 route | Odoo counterpart | Required surface |
| --- | --- | --- |
| `/expenses` | `/odoo/expenses` | My Expenses list/kanban/form/graph/pivot/activity |
| `/expenses/to-process` | `/odoo/expenses-to-process` | submitted queue plus search panel |
| `/expenses/analysis` (preserve `/expense-analysis` alias) | `/odoo/expenses-analysis` | graph/pivot/list/form analysis |
| `/expenses/employee` | `/odoo/expenses-employee` | employee expense list/kanban/form/pivot/graph |
| `/expenses/detail` | expense form state | stateful detail and receipt/chatter actions |
| `/expenses/categories` | Expense Categories | list/kanban/form |
| `/expenses/settings` | Expenses Settings | settings form |

Department-scoped approval/analysis and accounting/payables entry points may
reuse these page IDs with scoped datasource parameters, but their scope and
permission behavior must be tested explicitly.

## Current evidence refresh

With generated global and Expenses styles present, authenticated Core3 checks
at 1440x900 and 390x844 loaded `/expenses/to-process` with three deterministic
rows and List/Kanban tabs, with no unexpected failed requests or horizontal
overflow. Corrected captures are
`/tmp/core3-expenses-{desktop,mobile}-to-process-recaptured.png`; the matching
installed Odoo references are `/tmp/odoo-expenses/expenses-to-process-{desktop,mobile}.png`.

The configuration batch is now implemented and browser-verified against the
installed disposable reference. Authenticated Core3 checks at 1440x900 and
390x844 loaded `/expenses`, `/expenses/to-process`, `/expenses/analysis`, the
legacy `/expense-analysis` alias, `/expenses/employee`, `/expenses/categories`,
and `/expenses/settings` with no unexpected failed responses or horizontal
overflow. The employee and category lists expose 9 and 4 deterministic rows;
the category New action opens its shared server form. Fresh comparison captures
are under `/tmp/core3-expenses-final/` and include desktop/mobile pairs for My
Expenses, Expenses to Process, Expense Analysis, Employee Expenses, Expense
Categories, and Settings. The implementation is in commits `e5f805d`,
`83fb678`, and `7c3dec3`; its source was developed in the dedicated
`agent/odoo-ui-expenses-impl` worktree.

Batch 2 is implemented in the dedicated `agent/odoo-ui-expenses-next`
worktree. It closes the receipt-gated approval/refusal detail gap: Submit,
Approve, and Post require a receipt; Refuse requires a persisted reason and
activity entry; Reset clears the refusal; and duplicate-receipt/error/empty
fixtures are deterministic. The page/API split remains joined by `page.id`.
See [expenses-batch-2.md](expenses-batch-2.md) for the bounded acceptance and
verification record. The disposable comparison used the live `core3_reference`
Odoo database at `http://127.0.0.1:8069`.

## Acceptance

- The implementation inventory maps every visible installed-addon menu and
  action above to a Core3 route, or records a deliberate redirect with its
  reason. The hidden Activity Types technical menu remains hidden.
- Authenticated Playwright checks navigate through the Core3 Expenses menu and
  cover desktop and 390px mobile states for each route, rather than asserting a
  direct URL only. Odoo reference captures are made at the listed `/tmp` paths
  after installing `hr_expense` with official demo data.
- List checks cover search, each named filter, date filter, group-by, search
  panel, optional columns, bulk/multi-edit affordance, pagination, row opening,
  and empty/error/denied states.
- View checks cover list, kanban, form, graph, pivot, activity, settings,
  category form, and all state-specific form/modal transitions; mobile checks
  verify no horizontal page overflow and usable action menus/forms.
- Workflow checks enforce Draft → Submitted → Approved → Posted → In Payment →
  Paid and Refused/Reset rules, with receipt requirements, duplicate review,
  split total validation, post journal modal, and permission boundaries.
- Datasource checks prove deterministic service-owned fixtures, stable ordering,
  seeded dates, idempotent migration/upgrade, and no page-local hard-coded
  records or remote image dependency.
- YAML validation, `bun run audit`, focused route/schema checks, authenticated
  browser smoke, and `git diff --check` pass. The implementation commit may
  contain YAML/TS/docs only; screenshots remain under `/tmp`.
