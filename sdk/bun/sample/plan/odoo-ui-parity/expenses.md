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

Batch 3 is implemented in the isolated `agent/odoo-ui-expenses-next-20260910`
worktree from parent HEAD `75ffcae4`. It closes the next visible Configuration
gap: Expense Categories now has a manager-only page/API contract, active and
archived filters, shared edit form actions, duplicate-name and optimistic
concurrency guards, archive/unarchive actions, deterministic archived data,
and an explicit error state. The Expenses manifest exposes Reporting and
Configuration as visible groups so the owned Odoo menu hierarchy is preserved.
See [expenses-batch-3.md](expenses-batch-3.md) for the live menu inventory,
bounded acceptance, and authenticated desktop/mobile evidence.

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

## Batch 4: core expense detail and workflow evidence (2026-09-11)

Status: implemented and verified in isolated worktree
`/home/nhanjs/projects/core3-worktrees/odoo-ui-expenses-detail-20260911` on
branch `agent/odoo-ui-expenses-detail-20260911`.

Reference discovery used the installed addon at
`/home/nhanjs/projects/odoo/addons/hr_expense` and the disposable demo database
`core3_expenses_demo` in the temporary authenticated Odoo container at
`http://127.0.0.1:8070`. Odoo reference forms were checked for draft, submitted,
approved, and refused records. Core3 keeps frontend page YAML and backend API
YAML separate and joins them through the expense detail `page.id`.

The bounded implementation adds Odoo-shaped deterministic detail metadata
(product, quantity, unit, vendor, manager, receipt fingerprint), attachment
listing/upload/download contracts, stable activity history, and guarded
Draft → Submitted → Approved → Posted → In Payment → Paid plus Refused/Reset
transitions. Edit, refusal, receipt upload, state, row-version, permission,
missing, stale, validation, error, and empty states are represented in the
service-owned YAML/API surface. No page-local SQL, moving fixture timestamps,
random fixture IDs, remote assets, or screenshots were added to Git.

Verification:

- `bun test test/expenses_next.integration.test.ts`: 6 pass, 0 fail, 30
  assertions.
- `bun run audit`: passed; 473 pages, 480 routes, 825 datasources.
- `bunx eslint packages/client/src/components/PageRoot.ts
  packages/client/src/components/PageDetailRenderers.ts`: passed with no
  output.
- `bun run css:build:global && bun run css:build:expenses`: passed.
- `git diff --check`: passed.
- Authenticated headless Chrome (`/usr/bin/google-chrome`) loaded the Core3
  detail matrix and Odoo reference forms with no failed requests/page errors;
  desktop and mobile document widths matched their viewports. An authenticated
  browser upload of `browser-receipt.pdf` returned HTTP 200 and showed the
  filename and `Receipt attached` after reload.

Comparison captures are intentionally outside Git. Every file below is a
non-full-page viewport capture at the stated dimensions.

Odoo reference captures (`/tmp/odoo-expenses-detail-20260911/`):

| File | Dimensions | SHA-256 |
| --- | --- | --- |
| `odoo-approved-desktop-1440x900.png` | 1440x900 | `d6db06310814aa413962b3e87ed10be8a52846b1147f10cb0fb04e03f035e448` |
| `odoo-approved-mobile-390x844.png` | 390x844 | `604bbc5f5111254e3021f9f488c4c69fc72095c85a1f10ee6a3efd8c4ac11074` |
| `odoo-draft-desktop-1440x900.png` | 1440x900 | `737063e7e83ab680de778b339c593157e30d1e024b845d32a0dfa564ffe6b076` |
| `odoo-draft-mobile-390x844.png` | 390x844 | `a11e71d5852f9b6342d58c46f12023634b6d8777b5fde07e0bf4801888fa370b` |
| `odoo-refused-desktop-1440x900.png` | 1440x900 | `982cb35604853f4809bbaf7f4b040aed29beb3088c1aaf5b8a1a9d7bac6075f4` |
| `odoo-refused-mobile-390x844.png` | 390x844 | `16368d689fd31ca7fd2c4d4b6c68d02dfc883df0897ef628c58cf026c08096f4` |
| `odoo-submitted-desktop-1440x900.png` | 1440x900 | `1ae1a8b93d6b3665e5511494ed3b90938d3285c8ac7ee640294efcc941db32c8` |
| `odoo-submitted-mobile-390x844.png` | 390x844 | `adb722db6f280e0e2fb452b9e63c2da2d48a6f7c60861073f71968d96111842c` |

Core3 captures (`/tmp/core3-expenses-detail-20260911/`):

| File | Dimensions | SHA-256 |
| --- | --- | --- |
| `core3-approved-desktop-1440x900.png` | 1440x900 | `8d022053f103ded1b3336b87e73f96681b1f8476dff2fb91fd5595961ebbfcef` |
| `core3-draft-desktop-1440x900.png` | 1440x900 | `56cfe7a10d5cb00b1ef5e3f345504cbd63218650b670659c512485de496eaa9c` |
| `core3-draft-mobile-390x844.png` | 390x844 | `0598afddc650d923ca2ca8050174d46381dbd00db962003c39989ff16c7c1b8c` |
| `core3-duplicate-desktop-1440x900.png` | 1440x900 | `00d382004fbdcd231ca518552f2f4aca97f5db62ea55951e812c6283f012d2a7` |
| `core3-duplicate-mobile-390x844.png` | 390x844 | `6d9daa5b0c868e4cd7610556ea0f43297d4f403c74ed2933fdeac7b211529ca7` |
| `core3-in-payment-desktop-1440x900.png` | 1440x900 | `60b81b9ffcec51f507bc60194a76e59dc77e9752f533dad89f3d2312996720ca` |
| `core3-paid-desktop-1440x900.png` | 1440x900 | `ebc085b840707d6301ac8272daf570381b71b49aafce7a13713d8e929a8eff6e` |
| `core3-paid-mobile-390x844.png` | 390x844 | `c7061be85c524a779a0d4640b50c8579eeb5a7d27477cfe9bb20a3efc2f788b2` |
| `core3-posted-desktop-1440x900.png` | 1440x900 | `80c3ab7fa0b64e6c3354575958620279c58665a174301290c99b8a173a7581c0` |
| `core3-refused-desktop-1440x900.png` | 1440x900 | `68e900205d3af46084bff57d152490a4fba1dbd7e81111b965d0ad793fefc226` |
| `core3-refused-mobile-390x844.png` | 390x844 | `e3c29640d5ddc7b607b1738fbc2b26b9e07cb8ab94e36672a66d3965ac61cb91` |
| `core3-submitted-desktop-1440x900.png` | 1440x900 | `50cad653dacc3c285a5ac3f52270ed0a0685083dd541d750d5095aa7546857fe` |
| `core3-submitted-mobile-390x844.png` | 390x844 | `2da5ca241d6f433e9183627e6d4c50023407266bbcf0d226da1063007e7d4620` |

Residuals and deferred scope:

- Full Odoo accounting move creation, payment reconciliation, and payment
  wizard are deferred; this slice provides deterministic journal/payment state
  actions and stable journal references.
- Split-expense editing, duplicate-review dialogs, full tax/analytic widgets,
  and full chatter composition/follower management remain deferred.
- Core3 uses shared text/select form primitives for several Odoo many2one and
  specialized accounting widgets; responsive layout and state/action semantics
  are covered, but pixel-level Odoo shell/icon parity is not claimed.
- Receipt binaries are local runtime uploads only; no binary or screenshot is
  committed.

## Duplicate receipt review follow-up (2026-09-11)

The duplicate-review action is now implemented in the expense detail surface.
It opens a guarded review modal with the deterministic similar-expense
candidate, decision choices, and Apply decision action. The parent checkout
verified the authenticated route `/expenses/detail?id=expense-demo-submitted-2`
at desktop and 390px mobile; the action returned one modal and no failed
requests or page errors. Rendered document widths matched both viewports.

Core3 captures remain outside Git:

- `/tmp/core3-expenses-duplicate-review-desktop-1440x900-20260911.png` —
  1440x900 — `94729dafd2096ef32af68007d45df6fd9b6062f0b2cd8cb0b2010453bd0266cc`
- `/tmp/core3-expenses-duplicate-review-mobile-390x844-20260911.png` —
  390x844 — `b45f710b20598147b5473e94e0bc5b5b23dd8a11f5ae03bb9b4abfe17d4cb6dc`

The source-backed Odoo reference modal was captured at
`/tmp/odoo-expenses-review-split-20260911/odoo-split-desktop-1440x900.png`
(`9ffac7a2…`). Odoo mobile comparison was not available from the reference
run. Split-expense editing remains deferred because the reference run did not
provide a valid split mutation flow; the duplicate decision contract is
covered.

## Post Expenses wizard follow-up (2026-09-12)

Batch 5 implements the next uncovered Odoo action, the accounting-only `Post
Expenses` wizard. See [expenses-batch-5.md](expenses-batch-5.md) for source
evidence, the page/API contract, deterministic migration, focused test/audit
results, and the honest browser-capture limitation.

## Expenses Analysis follow-up (2026-09-12)

The next bounded visible action is Reporting → Expenses Analysis, Odoo menu
`hr_expense.menu_hr_expense_all_expenses` → window action
`hr_expense.hr_expense_actions_all` (`/odoo/expenses-analysis`). Its source
view order is `graph,pivot,list,form`, with search view
`hr_expense_view_search_with_panel` and context defaulting the state search
panel to draft, submitted, approved, posted, in payment, and paid. The graph
measures `total_amount` and `tax_amount` by date/employee; the pivot groups
employee by expense-date month and measures total amount. Refused rows are
excluded by the active-state context. The action is available to ordinary
Expenses users; manager-only operations are not exposed by this read surface.

This batch moves the analysis datasource to
`services/expenses/api/analysis.yaml`, keeps the page presentation-only, and
adds deterministic graph/pivot/list tabs, filters, grouping, detail navigation,
active-state filtering, empty results, and transport-error metadata. The
generic Core3 ListView contract currently has filter dropdowns but no dedicated
Odoo search-panel component, so the state/employee/company facets are exposed
through the shared filter contract; a reusable search-panel primitive remains a
follow-up rather than an Expenses-specific renderer.

Verification for this batch: `bun test
test/expenses_analysis.integration.test.ts test/expenses_next.integration.test.ts
test/expenses_categories.integration.test.ts` passed 13 tests and 91
assertions; `bun run audit` passed with 608 pages, 616 routes, and 1,049
datasources. The Odoo source reference was authenticated at
`http://127.0.0.1:8073` and the desktop analysis route was captured at
`/tmp/core3-odoo-parity/expenses-analysis-wave2/odoo-desktop.png` (1440x900).
The mobile route redirected to Discuss and had one failed request, so the
mobile image is not treated as an Expenses reference. Core3 desktop and mobile
capture attempts were blocked by `ERR_CONNECTION_REFUSED`: startup aborts in
`createYamlApi` on unrelated existing action `sms_marketing.mailings.cancel`
because its permission differs from the workflow transition, leaving no
backend listener on port 3001 and no valid Core3 visual-parity claim. The
temporary Playwright install and all screenshots remain outside Git.

## Department approval follow-up (2026-09-12)

Batch 6 implements the next unrepresented source action,
`action_hr_expense_department_to_approve`, as the explicit scoped route
`/expenses/to-approve`. It preserves submitted-only ordering, department
selection/default scope, shared list/kanban/pivot views, receipt-gated approval,
reasoned refusal, permission metadata, and deterministic empty/error fixtures.
The department-scoped graph/pivot action remains separately deferred. See
[expenses-batch-6.md](expenses-batch-6.md) for the source contract and exact
reference limitation: the primary Odoo addon is uninstalled, so no visual
capture is claimed.

## Department analysis follow-up (2026-09-12)

The next bounded source-backed action is Odoo's
`action_hr_expense_department_filtered`, the department integration's
read-only `Expense Analysis` action with `graph,pivot` view order and an
`active_id` department context. Core3 now exposes the explicit handoff route
`/expenses/department-analysis`, defaulting deterministically to `Sales` and
allowing the department scope to be changed through the shared filter. The
page/API split is joined by `page.id`; the API has read permission, stable
empty/error fixtures, detail navigation, and deliberately no mutation/CRUD
action because the Odoo source action defines no write operation.

The primary Odoo database still has `hr_expense` uninstalled, so this batch
does not claim an authenticated visual capture. The department graph/pivot
surface is otherwise source-backed and covered by the focused integration
test.
