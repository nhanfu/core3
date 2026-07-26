# Parity Completion Audit

Audited 2026-07-27 against `.scratch/movedx-feature-parity/PRD.md`.

## Current verification

- Row-action and action-definition permissions now flow through the validated YAML grammar and renderer. Orders and quotes hide mutations without `orders.write`/`orders.approve` or `crm.write`, while server authorization remains authoritative; framework tests pass 179/179 and app tests pass 44/44.
- Catalog master-data and system-configuration row mutations now declare `catalog.write` or `system.write` in both the grid action and action definition, with read-only navigation/preview actions explicitly marked; the app contract suite passes 46/46.
- Accounting advances, debit notes, payment requests, and settlements now declare `accounting.read`, `accounting.write`, `accounting.approve`, or `accounting.pay` consistently across row controls and action definitions, including the fresh workflow audit's authorization checks.
- HR employees, contracts, shifts, timesheets, and payroll now declare `hr.read`, `hr.write`, `hr.approve`, or `hr.pay` consistently across row controls and action definitions; the app contract suite passes 47/47.
- Customer, partner, and shared CRM contact mutations now declare `crm.read` or `crm.write` consistently across list/detail controls and action definitions; the app contract suite passes 48/48.
- Vehicles, containers, drivers, locations, and areas now declare their fleet/dispatch/driver read and write permissions consistently across list controls and action definitions; the app contract suite passes 49/49.
- Branches, departments, teams, users, roles, role/user detail grants, and company documents now declare `settings.read` or `settings.write` consistently across organization/RBAC controls and action definitions; the app contract suite passes 50/50.
- Trip lifecycle actions and order/quote detail line mutations now declare `trips.write`, `orders.write`, or `crm.write` in both row controls and action definitions; the app contract suite passes 51/51 and the named transition audit remains clean.
- Accounting document detail lines, invoice templates, ledger accounts, and area detail editors now declare `accounting.write` or `dispatch.write` in both controls and action definitions; the app contract suite passes 52/52.
- Chat thread creation, messaging, read-state, attachment upload, and attachment download now declare `chat.read` or `chat.write` in the YAML action definitions; the app contract suite passes 53/53 and the fresh membership audit remains clean.
- Employee, contract, driver, vehicle, branch, and department detail editors now declare domain write permissions; HR document upload/download controls also declare `hr.write`/`hr.read`; the app contract suite passes 54/54.
- Legacy fleet, maintenance, and payroll editors now declare `fleet.write`, `maintenance.write`, or `hr.write` on row controls and action definitions; the app contract suite passes 55/55 and all provisional routes remain reachable.
- The legacy settings tabs and system approval-flow/print-template builders now declare `settings.write` or `system.write` on every remaining form, server, delete, and reorder action; the app contract suite passes 56/56.
- The YAML schema now requires a non-empty permission on every mutating action type (`form`, `server_form`, `delete`, `patch`, `server`, `upload`, and `download`); framework tests pass 180/180 and app tests remain 56/56.
- System print-template details now include a declarative, safe text preview with a print action, backed by the template and block datasources; framework tests pass 182/182 and app page contracts remain 56/56.
- The system code-rule preview action now surfaces the server-generated preview through the shared YAML server-action result contract instead of discarding it; framework tests pass 183/183 and the fresh workflow audit records `code_rule_previews=1` with zero failures.
- Legacy GridView pages now accept declarative localized empty states, and the fleet, maintenance, settings, and reports shells no longer fall back to English `No records found`; framework tests pass 184/184 and app contracts pass 57/57.
- Legacy filter-bar pages now declare localized `Tất cả` and `Xóa bộ lọc` labels through the validated YAML filter contract; framework tests pass 185/185 and app contracts pass 58/58.
- The TMS renderer now marks server page configs as Vietnamese and passes locale-aware labels into canonical and legacy grids, covering pagination summaries, row selection, tree controls, and page navigation; framework tests pass 187/187 and fresh audits remain clean.
- ApprovalTimeline now accepts declarative localized empty-state copy; all eight canonical detail timelines no longer fall back to English `No activity yet`; framework tests pass 188/188 and app contracts pass 59/59.
- ApprovalTimeline now supports declarative action-label mappings; employee, contract, payroll, and user detail timelines translate raw `create`, `update`, `upload`, workflow, and role-management actions before rendering; framework tests pass 189/189 and app contracts pass 60/60.
- Every canonical DataGrid now declares a Vietnamese empty state, eliminating the shared English `No records found` fallback across system, analytics, dashboard, quote, and organization detail grids; framework tests remain 189/189 and app contracts pass 61/61.
- Chart definitions now use validated semantic colors (`blue`, `indigo`, `green`, `amber`, `red`, `teal`) resolved through the shared MovedX token palette; raw hex chart values are rejected by the YAML schema, preserving theme consistency; framework tests pass 190/190 and fresh audits remain clean.
- System shipment-type and trip-status master-data lists now expose the shared declarative CSV export control required by the page acceptance contract; app contracts pass 62/62 and fresh page/workflow audits remain failure-free.
- The canonical area hierarchy now exposes the same shared CSV export control as the other master-data lists; app contracts pass 63/63 and fresh page/workflow audits remain failure-free.
- Accounting debit-note, payment-request, advance, and settlement lists now expose server-backed document-date ranges wired to their datasource SQL; app contracts pass 64/64 and fresh page/workflow audits remain failure-free.
- Driver compliance now exposes a server-backed license-expiry date range, with the list query filtering `license_expiry` directly; app contracts pass 65/65 and fresh page/workflow audits remain failure-free.
- Migration coverage now has a unit-test contract for the four tracked SQL migrations and the server's idempotent version bookkeeping; the focused schema test passes 6/6, the full app suite passes 65/65, and framework tests pass 190/190.
- XLSX import/export now has focused unit coverage for tabular round-tripping, quoted and localized cell values, numeric cells, and malformed workbooks; the app suite passes 67/67, framework tests pass 190/190, and fresh page/workflow audits report zero failures with `xlsx_roundtrips=1`.
- A fresh seeded verification after the XLSX contract addition still loads all `pages=68`, `sources=191`, and `direct_routes=52` with zero page/source/direct/route failures; the workflow audit completes all named transitions and scope checks with `failures=0`.
- The shared icon registry now owns close, chevron, directional, and trend controls across the framework modal/search/filter/paginator surfaces and the TMS shell/profile; focused icon/modal/stat coverage passes 13/13, full framework tests remain 190/190, app tests 67/67, and fresh page/workflow audits remain failure-free.
- Declarative page toolbar icons are now part of the validated YAML grammar and render through the shared SVG registry; the framework suite passes 191/191, app tests remain 67/67, and fresh audits validate all 68 pages, 191 datasources, 52 routes, and named workflows with zero failures.
- Declarative row-action icons are now accepted by the YAML grammar and rendered by both canonical DataGrid and legacy ActionCell surfaces; focused DataGrid/GridView/schema coverage passes 55/55, full framework tests remain 191/191, app tests 67/67, and fresh page/workflow audits remain failure-free.
- Declarative DataGrid bulk-action icons now render through the same shared SVG registry, with DataGrid coverage passing 16/16; full framework tests remain 191/191, app tests 67/67, and fresh page/workflow audits remain failure-free.
- The complete icon propagation pass now covers page toolbars, DataGrid bulk actions, canonical row actions, legacy ActionCell actions, search/date controls, and detail navigation; the fresh seeded page audit remains `pages=68 sources=191 direct_routes=52` with zero failures.
- Branch-scoped quote and accounting-entry queries now have explicit `idx_quotes_branch` and `idx_accounting_entries_branch` indexes in the base schema and versioned migration `005-scope-indexes.sql`; schema contracts pass 7/7, the app suite passes 68/68, framework tests 191/191, and fresh page/workflow audits remain failure-free.
- CRM visibility and ownership predicates now have `006-crm-scope-indexes.sql` covering customer/partner visibility-owner and lifecycle/type status paths; schema contracts pass 8/8, the app suite passes 69/69, framework tests 191/191, and fresh page/workflow audits remain failure-free.
- Shell notification reads and read-state updates now have the user/read/timestamp index in the base schema and versioned migration `007-notification-scope-index.sql`; schema contracts pass 9/9, the app suite passes 70/70, framework tests 191/191, and fresh page/workflow audits remain failure-free.
- CRM, order, fleet, and accounting lookup datasources now enforce the same branch and customer/partner visibility predicates as their list and detail pages; page contracts pass 52/52, the app suite passes 71/71, framework tests 191/191, and fresh page/workflow audits remain failure-free.
- Migration `008-relationship-query-indexes.sql` now covers driver-to-truck lookups, maintenance truck/date and technician queries, accounting settlement/tree links, and activity resource drill-downs in both the base schema and versioned migration; schema contracts pass 10/10, the app suite passes 72/72, framework tests 191/191, and fresh page/workflow audits remain failure-free.
- HR shifts now include a declarative `ScheduleGrid` calendar grouped by employee and work date, backed by the existing scoped assignment datasource while retaining list filtering/export; focused component coverage passes 6/6, page contracts pass 53/53, the app suite passes 73/73, framework tests 192/192, and fresh page/workflow audits remain failure-free.
- Order and order-detail customer forms now use the shared searchable `AsyncSelect` lookup adapter, including single/multi-value serialization; form-field lookup datasources are now collected and fetched declaratively, focused renderer coverage passes 11/11, page contracts pass 54/54, the app suite passes 74/74, framework tests 195/195, and fresh page/workflow audits remain failure-free.
- Trip departure and arrival editors now preserve minute-level timestamps through `datetime-local` fields instead of truncating them to dates; focused renderer coverage passes 12/12, page contracts pass 55/55, the app suite passes 75/75, framework tests 196/196, and fresh page/workflow audits remain failure-free.
- Fresh-server verification passes with `pages=68`, `sources=191`, `direct_routes=52`, zero page/source/direct/route failures, `reference_dirs=1`, and workflow `failures=0`.

## Proven

- 68 page YAML definitions load through the authenticated page API.
- 191 server-owned datasource definitions execute successfully on a fresh seeded database.
- 52 registered SPA routes mount in a real browser with zero route-panel or console-error failures.
- Sixteen seeded populated detail targets (orders, quotes, financial documents, HR, fleet, organization, area, company settings, print-template, and approval-flow editors) also mount with zero browser failures and assert the expected seeded business identifier in each panel.
- The full browser route/detail matrix passes at an explicit 1024 x 768 tablet viewport with zero document-level horizontal overflow.
- The same browser route matrix reruns at an explicit 1440 x 1000 desktop viewport with zero route, console, or document-overflow failures.
- The browser parity audit exercises every discovered shared control on all 52 routes and 16 populated details with zero failures at 1024 x 768 and 1440 x 1000, including 336 sortable headers, 142 status tabs, 47 column choosers, 4 tree expand/collapse controls, 375 row actions dispatched with mutation POSTs blocked, 20 exports, and all discovered search/editor controls; every opened form dialog also passed the Escape-dismissal check.
- List-toolbar Excel exports now refetch the complete active filtered dataset in bounded server pages and emit a dependency-free OOXML workbook; explicit CSV fallback remains available.
- Every page YAML has a route-specific evidence directory and controls checklist.
- Every route has local desktop/tablet evidence, including the five provisional legacy pages.
- `bun apps/tms/scripts/audit-evidence.ts` verifies `page_yaml=68`, `evidence_dirs=71`, `controls=71`, `local_desktop=71`, and `local_tablet=71` with no missing local artifacts; it reports the limited reference capture set separately (`reference_dirs=1`).
- Every registered SPA path has a page-loader mapping and serves the shell on direct navigation; deep-link 404s are covered by the route audit.
- A disposable fresh-database action audit completes 31 named transitions, 8 invalid-transition rejection checks, 3 invalid-payload validation checks, one master-data create/update/delete round-trip, two approval/print reorder round-trips, one malformed-import rejection, and a least-privilege `403` check.
- The same fresh-database audit verifies one Draft order-detail header update, while the runtime contract rejects the same update after `Pending Approval` with `409`.
- The same fresh-database audit now completes create/list/update/delete round-trips for shipment types, trip statuses, fee rules, and storage configurations, proving the four system configuration CRUD pages share the authorized generic resource contract.
- Named workflow actions, field allowlists, and audit writes remain server-authorized; framework tests pass 178/178, including shared SVG icon aliases, chat refresh lifecycle coverage, Vietnamese confirmation defaults, YAML editor-modal keyboard semantics, chart accessibility, date-range state retention, declarative filter retention, conditional toolbar visibility, and compact dashboard layout/toolbar coverage.
- Shared YAML delete and patch actions now forward their declared resource scope to the server, and the browser CRUD audit verifies scoped unit deletion.
- Dashboard period controls match the supplied reference states with segmented `Tháng này`, `Tháng trước`, `Quý này`, `Năm nay`, and `12 tháng` presets at desktop and tablet widths.
- Dashboard composition now follows the supplied reference order: compact title/greeting row, period/date controls with inline export, then KPI rows; the reference-specific dashboard search and extra toolbar row are removed while CSV export remains available.
- Dashboard KPI information architecture now matches the supplied reference sections, including the seven-card task row, six-card operating/financial/HR rows, and VND financial formatting.
- Dashboard task cards now expose validated, keyboard-accessible navigation to the owning order, trip, accounting, and HR routes, preserving status and unassigned-trip filters.
- Dashboard financial KPI row now includes the reference date-bounded profit-margin card instead of the non-reference quote-count card.
- Operations navigation now exposes all six reference entries and maps each to a registered SPA route.
- The shell reads the seeded company profile through an authenticated server endpoint and renders tenant identity in the header; it is not hard-coded in the client.
- The shared header exposes the reference theme toggle, persists the light/dim preference in browser storage, and renders the authenticated user name beside the profile avatar.
- The shared header renders the reference attendance clock with a compact live `HH:mm` label.
- The shared header also exposes functional sidebar collapse, attendance, and chat controls; collapse keeps the icon rail usable without horizontal overflow.
- The shared sidebar footer renders the reference `© 2026 MovedX · v0.1` marker and hides it cleanly in the collapsed rail.
- Authenticated shell mount shows a dynamic, dismissible welcome toast matching the reference overlay state.
- Shared list toolbars expose SVG advanced-filter and help controls; advanced fields start collapsed on resource lists and can be opened without losing filter state.
- Shared list-toolbar filters now support validated datasource-backed option lists; order shipment filtering consumes the system shipment-type catalog.
- Legacy FilterBar selects now support validated datasource-backed value/label options; the fleet type filter consumes the vehicle-type catalog labels.
- Audited resource lists default to the reference 50-row density and support server-backed 10/25/50/100 page-size changes.
- Status-tab badges use server-owned full-dataset facets rather than the current page slice; orders, vehicles, and drivers were verified against fresh seeded counts.
- Audited resource lists now render declarative reference-style breadcrumbs and current titles without affecting dashboard intro composition.
- Primary actions now share the breadcrumb row; fresh 1440px orders geometry matches the reference header/search vertical alignment.
- Audited DataGrids include a server-page-aware row-number column after selection, matching the reference table structure.
- Customer CRM now includes the reference company-scope pill and building SVG avatar on primary entity cells.
- Audited customer and order grids now expose the reference type/creator and separate order/customer columns.
- Orders now map the reference `Mã HT` column to the business order code instead of the internal row ID.
- Vehicles now map the reference `Mã HT` column to a human-facing `XE...` identifier instead of the internal row ID.
- Customers now map the reference `Mã HT` column to a human-facing `KH...` identifier instead of the internal row ID.
- Vehicle status controls now match the reference outlined two-toggle, no-badge presentation.
- Dashboard renders a declarative in-page greeting using the authenticated user runtime state.
- Dashboard period state defaults to the selected current-month preset with synchronized date fields and datasource bounds.
- Dashboard date-range and CSV-export controls remain server-backed after the reference-specific search control was removed.
- Shared KPI cards use compact reference-density spacing; the dashboard chart heading is visible within the 1440 x 1000 viewport.
- Dashboard includes declarative monthly revenue/cost/profit line data plus trip-status chart data.
- CRM dashboard now includes period-filtered ranked customer-value and employee/department breakdown grids alongside KPI and quote-pipeline metrics.
- CRM KPI reporting now includes period-filtered lead, active-customer, accepted-quote, and conversion-rate summary cards.
- System activity now defaults to the reference twelve-month audit window while retaining custom dates and other period presets.
- Dashboard chart slots sit side by side at desktop width and wrap naturally at tablet width without document overflow.
- Trip-status chart uses the shared pie variant to match the supplied reference composition.
- Approval-flow and print-template detail grids now support declarative drag-and-drop row ordering backed by their existing server-authorized move actions; the DataGrid reorder hook is covered by a focused component test.
- Print-template block forms now use a shared rich-text field with declarative token-picker buttons for order number, customer, route, and line tokens.
- Currency catalog now includes server-owned rate-to-VND/effective-date/source fields and an audited, permission-gated synchronization action; the fresh workflow audit verifies all three seeded rates persist.
- Role management now includes server-validated `all`/`branch`/`own` view-scope configuration in list/detail YAML and the shared source-prefilled editor; workflow audit covers valid and rejected scope updates.
- Shared list exports now render the reference `Xuất Excel` label and produce `.xlsx` downloads with escaped text and numeric cells.
- Master-data imports accept both CSV and OOXML `.xlsx` workbooks; the fresh workflow audit verifies a generated XLSX round-trip alongside malformed-CSV rejection.
- Contract detail pages now expose permission-gated attachment upload/download flows backed by `contract_documents`; the fresh workflow audit verifies one stored contract upload and authenticated byte-for-byte download.
- The own-company settings page now exposes permission-gated attachment upload/download flows backed by `company_documents`; the fresh workflow audit verifies one stored company upload and authenticated byte-for-byte download.
- Organization users now expose a server-backed seat-usage summary (`used`, `available`, and configured limit) sourced from the seeded organization capacity setting.
- User create/edit forms now use datasource-backed branch and department selects instead of free-form internal IDs.
- Team create/edit forms now use datasource-backed department and active-employee manager lookups.
- Customer and partner create/edit forms now use owner lookup options that preserve existing assignments and include active employees.
- Location create/edit forms now use a datasource-backed area lookup instead of free-form area IDs.
- Areas now support a persisted parent relationship, parent display, and ancestor-walking cycle validation; workflow audit covers self-parent and two-node cycle rejection.
- Area, department, and ledger-account grids now render hierarchy depth indentation and keyboard-accessible collapse/expand controls from persisted parent relationships.
- Departments now support a persisted parent relationship, parent display, and ancestor-walking cycle validation.
- Department create/edit forms now use a branch lookup instead of free-form branch IDs.
- Quote create/edit forms now use a customer lookup preserving legacy quote customer values.
- Shift assignment and timesheet forms now use employee and shift lookup selectors instead of raw IDs.
- Payroll create/edit forms now use an employee lookup selector instead of a raw employee ID.
- Payroll detail editors now use the same employee lookup selector instead of a raw employee ID.
- Contract list and detail editors now use employee lookup selectors instead of raw employee IDs.
- Container create/edit forms now use a location lookup selector instead of a raw location ID.
- Container forms now source container types from catalog master data while preserving existing type codes.
- Vehicle forms now source vehicle types from catalog master data while preserving existing type codes.
- User create/edit forms now support native multi-select role assignment backed by the role lookup datasource.
- Order create/edit forms now use a customer lookup sourced from active CRM customers instead of free-form names.
- Order create/edit forms now source shipment types from system configuration while preserving existing values.
- Vehicle forms now use a branch lookup, and driver forms use a vehicle lookup, replacing raw internal IDs.
- Advances now calculate linked settlement and outstanding amounts, while settlements expose a validated linked-advance selector and reference column; workflow audit covers invalid-link rejection.
- Transactional accounting editors now source currencies from the catalog while preserving existing currency codes.
- Invoice-template and ledger-account editors now source currencies from the catalog while preserving existing currency codes.
- Order, quote, and accounting line-item editors now source units from the catalog while preserving existing unit values.
- Trip editors now use vehicle, active-driver, and cargo-type lookups while preserving existing assignments and cargo values.
- Maintenance editors now use vehicle and enabled-technician lookups instead of raw internal IDs.
- Employee list and detail editors now use active-department lookups while preserving existing department names.
- Container editors now use active-partner owner lookups while preserving existing owner names.
- The legacy settings user editor now uses native multi-select role lookup options.
- The legacy fleet editor now shares vehicle-type and active-driver lookups with the canonical fleet route.
- Invoice template create/edit forms now use the shared rich-text token picker for invoice number, customer, total, and tax placeholders.
- Ledger accounts now support persisted parent relationships, parent display, datasource-backed parent selection, and server-side self-parent validation.
- An opt-in fresh-browser mutation audit performs normal pointer clicks for order submit/approve, units master-data create/edit/delete, quote send/accept, payroll approve/pay, debit-note submit/approve/pay, and Chat mark-read/send; all six phases pass with zero UI mutation failures on a fresh seeded database.
- The opt-in mutation audit was rerun after the shared modal CSS extraction against a clean seeded database (`TMS_AUDIT_MUTATIONS=1 TMS_AUDIT_MUTATIONS_ONLY=1`) and passes all six normal-click flows with `ui_mutation_failures=0`; the audit harness now locates the modal through `.core3-form-overlay` instead of relying on inline z-index.
- ChatWorkspace now supports a declarative five-second refresh interval for thread, message, and attachment datasources, with timer disposal covered by a framework unit test.
- Shared YAML CRUD editors now use Vietnamese `Chọn…`, `Lưu`, and `Hủy` labels, and the shared confirmation dialog defaults to Vietnamese; focused unit coverage verifies the confirmation shell.
- AppShell, notification polling, profile drawer listeners, attendance clock, and the welcome toast now implement explicit disposal; logout invokes that teardown and replaces the authenticated shell with the login outlet, preventing duplicate timers, stale body-mounted overlays, and leaked document listeners.
- TMS app-level jsdom coverage passes 12/12 for shell lifecycle, localized branding/navigation, organization and provisional-page contracts, notification state/copy, profile-drawer dismissal, semantic icons, and i18n-driven overlay/page refresh (`bun run test` from `apps/tms`).
- Notification items now support authorized individual read actions, update unread badges immediately, and retain keyboard-accessible button semantics.
- Notification status icons now use the shared semantic SVG registry instead of emoji glyphs; app-level coverage verifies an SVG icon is rendered for unread notifications.
- Shared YAML form modal surfaces now consume the token-backed `movedx-components.css` contract for controls, textareas, rich-text token pickers, and layout; generated fields no longer inject inline layout CSS, and the focused renderer test verifies the class-based contract. The fresh browser matrix still passes all 52 routes and 16 details at tablet and desktop viewports.
- Notification, profile, password, and shell identity copy now resolve through the active i18n catalog; the seeded Vietnamese translations are exercised by app-level tests and the fresh page/workflow audit.
- ProfileDrawer now dismisses with Escape and removes its document listener on disposal; fresh page and workflow audits remain at zero failures.
- YAML CRUD editor modals expose dialog semantics, connected labels, initial focus, Vietnamese save status, and Escape dismissal; the focused renderer test passes 1/1, and the browser control audit now checks that opened dialogs close on Escape.
- Shared visual fallbacks now use the semantic SVG icon registry instead of emoji glyphs for login branding, search, empty states, image placeholders, dashboard tips, and provisional-route placeholders; framework icon coverage passes 3/3.
- `ComingSoon` now renders the declared semantic icon, and YAML `TabGroup` now uses token-backed shared classes with `tab`/`tabpanel` semantics and class-based panel switching; focused coverage passes 4/4 and the full framework suite passes 172/172.
- DataGrid sortable headers now render semantic SVG sort indicators, and dense cell truncation uses the shared class/token contract without per-cell inline sizing styles; focused DataGrid/icon coverage passes 18/18.
- DataGrid sorting is now server-backed: sortable-header state flows through `renderPage` and `/api/query` into a validated projected-column `ORDER BY` before `LIMIT/OFFSET`; the renderer regression passes 3/3 and a fresh seeded API check returned vehicles globally ordered by plate.
- Legacy `GridView` pages now participate in the same server-backed sorting contract with semantic SVG indicators and `aria-sort`; focused GridView coverage passes 24/24 and the full framework suite passes 172/172.
- The unauthenticated entry point now uses MovedX branding and the active `login` i18n catalog for title, labels, progress, validation, and demo-copy states; app coverage passes 12/12 and a fresh seeded API check returned the Vietnamese login translations.
- The vehicle list now matches the supplied MovedX status-tab composition: `Tất cả`, `Sẵn sàng`, `Bảo dưỡng`, and `Ngưng hoạt động`, with each tab retaining server-backed status filtering.
- The shared shell now uses the MovedX Vietnamese subtitle and `Đội nhóm` organization label; app-level coverage protects the localized shell labels.
- The organization team route now uses `Đội nhóm` consistently in its title, toolbar, search, empty state, editor, and confirmation copy; its YAML contract is covered by the app page-contract suite.
- The vehicle status-tab YAML contract is protected by a focused page-contract test; TMS app coverage passes 12/12 after the reference alignment.
- A fresh seeded page/data audit after the vehicle-tab change passes all 68 pages, 179 datasources, and 52 direct routes with zero failures.
- Driver, container, location, and area status tabs now suppress facet badges to match the supplied fleet/catalog reference screens; the page-contract suite protects the badge-free declarations.
- YAML form selects now support localized object options while preserving their internal values on submit; vehicle, driver, container, location, area, customer, partner, organization, HR, and catalog forms expose Vietnamese status/lifecycle labels, with renderer coverage for the value/label contract.
- A fresh seeded page/data audit after the form-option migration passes all 68 pages, 179 datasources, and 52 direct routes with zero failures.
- The shared DataGrid column chooser now uses the Vietnamese `Cột` label and localized `Hiển thị …` accessibility names; focused DataGrid coverage passes 15/15 and the full framework suite remains 172/172.
- Shared status tabs, list-search defaults, clear-search controls, and select-all accessibility names now use Vietnamese MovedX-facing copy; focused list/status coverage passes 18/18 and the full framework suite passes 172/172.
- Reachable provisional `/fleet`, `/maintenance`, `/reports`, and `/settings` shells now use Vietnamese titles, controls, metrics, editor fields, and confirmations; the app page-contract suite protects their route-facing copy.
- Canonical role-scope, HR shift, invoice-template, ledger-account, storage, and approval-flow editor selects now display Vietnamese labels while retaining their internal values; the seeded page/data audit remains green across all 68 pages and 179 datasources.
- Remaining canonical system and analytics selects now expose Vietnamese labels for code-rule cadence, fee/trip status, print-template block/token choices, and organization summaries without changing stored values; the full seeded route/data audit passes with zero failures.
- Badge-free canonical status tabs now skip facet-count queries entirely while count-enabled tabs retain server-owned facets; focused renderer coverage passes 5/5 and the full seeded route/data audit remains 68/68 pages with zero failures.
- The shared authenticated shell now matches the supplied MovedX customer reference by removing the non-reference center search/title strip and using the reference `Điều xe & Tài xế` sidebar subtitle; TMS shell/page-contract coverage passes 12/12.
- The customer route now follows the supplied MovedX list composition: scope-aware breadcrumb header, icon-only Excel/help utilities, count-bearing lifecycle tabs, and the reference-visible identity/contact columns; app page-contract coverage passes 13/13 and the fresh seeded audit remains 68/68 pages, 179 datasources, and 52 direct routes with zero failures.
- Customer lifecycle tabs now support the shared contained-card variant, joining the reference-style tab strip to the DataGrid surface; focused StatusTabs coverage passes 2/2.
- Canonical system, HR, trip, user, and CRM editors now render Vietnamese labels for their remaining enum and boolean options while preserving the stored values; app page-contract coverage passes 14/14 and the fresh seeded audit remains 68/68 pages, 179 datasources, and 52 direct routes with zero failures.
- Declarative page exports/imports now use the shared semantic `download`/`upload` SVG names instead of raw arrow glyphs across the route matrix; the page contract guards all YAML declarations.
- The partner CRM list now shares the customer reference composition with scope breadcrumb, utility actions, count-bearing contained type tabs, and compact identity/contact columns; app page-contract coverage passes 16/16.
- Standard resource-list routes now opt into the contained tab-to-grid composition wherever their tab and grid are adjacent; vehicle status toggles remain intentionally separate. App page-contract coverage passes 17/17 and the fresh seeded audit remains 68/68 pages, 179 datasources, and 52 direct routes with zero failures.
- CRM list toolbars now expose an opt-in semantic search button beside the keyword field, matching the supplied MovedX customer reference; focused ListToolbar coverage passes 18/18 and the fresh seeded audit remains green.
- All six canonical catalog lists now expose the shared MovedX `Danh mục` breadcrumb hierarchy; app page-contract coverage passes 18/18.
- All eight canonical accounting list/summary routes now expose the shared `Kế toán` breadcrumb hierarchy; app page-contract coverage passes 19/19.
- All five canonical HR routes now expose the shared `Nhân sự` breadcrumb hierarchy; app page-contract coverage passes 20/20.
- All six canonical organization and permission routes now expose the shared `Tổ chức & phân quyền` breadcrumb hierarchy; app page-contract coverage passes 21/21.
- All eight canonical system routes now expose the shared `Hệ thống` breadcrumb hierarchy; app page-contract coverage passes 22/22.
- Quotes and both CRM analytics routes now expose the shared `Kinh doanh` breadcrumb hierarchy; app page-contract coverage passes 23/23.
- Chat, schedule, and trips now expose the shared `Điều hành` breadcrumb hierarchy; app page-contract coverage passes 24/24.
- Drivers, containers, locations, and areas now expose the shared `Danh mục` breadcrumb hierarchy; app page-contract coverage passes 25/25.
- Canonical order, CRM, accounting, HR, fleet, organization, catalog, and system detail routes now retain their parent breadcrumb hierarchy; app page-contract coverage passes 26/26.
- Organization and fleet relationships now declare database foreign keys and supporting indexes for roles, branches, containers, vehicles, trips, orders, and HR assignments; mutable user/area hierarchy links remain repository-validated because DuckDB rejects updates to referenced parent rows.
- The relational-index hardening is now tracked by an idempotent `schema_migrations` runner and `001-relational-indexes.sql`, with schema contract coverage passing 3/3.
- Historical additive schema alignment is now tracked as `002-legacy-schema-alignment.sql`; startup only runs the versioned migration set before seeding, with schema contract coverage passing 4/4.
- Driver and vehicle detail routes now expose permission-gated edit forms using the same validated lookups and server-authorized update path as their list routes; app page-contract coverage passes 27/27.
- Area, branch, and department detail routes now expose permission-gated edit forms with hierarchy/branch lookups; app page-contract coverage passes 28/28.
- User detail now exposes a permission-gated profile editor with branch, department, language, enabled-state, and multi-role lookups; page-contract coverage passes 21/21.
- Shared CRM detail now edits both customer and partner profiles through a kind-aware server action; the DuckDB-compatible mutable-contact migration preserves child data, with app coverage passing 35/35 and the workflow audit proving `crm_entity_updates=2`.
- CRM detail prefill now includes raw status and kind-specific lifecycle enums alongside the localized labels, so customer and partner editors can round-trip their seeded values directly.
- YAML form fields now support validated state-based `show_if` conditions; the shared CRM editor renders customer lifecycle or partner-type controls selectively, with framework modal coverage passing 6/6 in the focused suite.
- Shared Chart rendering now has a Vietnamese empty state, an accessible canvas label, and a screen-reader data summary; focused chart coverage passes 2/2.
- Shared date-range controls now retain manually edited bounds and clear stale preset selection before refetching; focused list-pattern coverage passes 19/19.
- Shared declarative select filters now retain their selected values through redraws; focused list-pattern coverage passes 20/20.
- Quote detail now exposes the shared header editor for Draft quotes while omitting status from generic form fields; seeded runtime editing returns 200 for Draft and 409 for Sent.
- Financial document detail header editing now uses repository-owned line-parent validation so Draft debit notes/payment requests can update safely under DuckDB; non-Draft workflow states remain protected.
- Order detail now exposes a Draft-only header editor with customer and shipment-type lookups while leaving status and derived totals server-controlled.
- The canonical dispatch trip editor now uses Vietnamese MovedX-facing titles, field labels, and row-specific cancellation confirmation copy; the page contract guards against the former English surface.
- Trip lifecycle changes now use server-authorized `trips.start`, `trips.complete`, and `trips.cancel` actions; the generic editor cannot mutate status, and the fresh workflow audit proves valid and rejected transitions.
- Payroll detail editing now mirrors the server workflow by exposing its editor only in Draft state; approval, reopen, and payment remain named actions.
- Quote detail editing now mirrors the list and server workflow by exposing its editor only in Draft state; send, accept, revise, and cancel remain named actions.
- Debit-note and container-type routes now declare explicit Excel export/import controls, with the shared renderer passing the XLSX format through the validated toolbar action contract.
- Shared DataGrid and StatusTabs surfaces now expose token-backed semantic hooks so the authenticated dim theme propagates through list panels, headers, cells, controls, and status tabs instead of retaining fixed white/gray utility colors; framework coverage protects the hooks.
- Shared ListToolbar search, date, filter, preset, advanced-filter, and help controls now consume the same token-backed surface/control contract across canonical resource lists.
- `TemplatePreview` renders print-template text, token placeholders, table markers, and spacing blocks without interpreting stored content as HTML; its print button is keyboard-accessible and its datasource binding refreshes after block mutations.
- Trips now carry explicit branch ownership, backfilled from assigned trucks during seed/migration; trip lists, dashboard KPIs/queues, reports, activity history, and server mutations accept either the trip branch or legacy truck branch. Fresh page audit passed 68 pages/191 sources/52 direct routes; workflow audit passed with `failures=0` and verified every seeded trip has a branch.
- Trip editors now expose a branch lookup for explicitly assigning unassigned trips; all-scope creation with an assigned truck persists that truck's branch automatically. Framework tests pass 196/196, app tests 77/77, and a fresh API round-trip returned `201` with `branch_id=branch-hcm`; fresh page/workflow audits pass 68 pages/192 sources/52 routes with `failures=0`.
- The fresh workflow audit now verifies the trip branch editor lookup itself: branch-scoped users receive only `branch-hcm`, while all-scope users receive the complete branch set.
- Financial form fields now use a shared token-backed `MoneyInput`: Vietnamese grouped display values serialize as plain numeric values for server actions. Order/quote/accounting line prices and HR salary fields are migrated; framework coverage passes 197/197, app coverage 78/78, and fresh audits pass 68 pages/192 sources/52 routes with `failures=0`.
- User role editors now use the searchable shared multi-select adapter instead of native multiple selects across canonical, detail, and legacy settings forms; selected role IDs serialize as arrays. Framework coverage passes 198/198, app coverage 79/79, and fresh page/workflow audits remain failure-free.

## Not Proven

- Visual parity against authoritative reference desktop/tablet states remains partially unverified because the workspace contains reference files for only one route directory; this does not block the automated unit-test and local interaction coverage required for the implemented behavior.

## Current commands

```sh
(cd apps/tms && TMS_BASE_URL=http://localhost:3339 bun run audit)
(cd apps/tms && TMS_BASE_URL=http://localhost:3339 TMS_CDP_URL=http://localhost:9222 bun run audit:ui)
# The browser audit also accepts an isolated seeded server, for example:
# TMS_DB_PATH=/tmp/core3-parity-3419.duckdb TMS_UPLOAD_ROOT=/tmp/core3-uploads-3419 PORT=3419 bun server.ts
# (cd apps/tms && TMS_BASE_URL=http://localhost:3419 TMS_CDP_URL=http://localhost:9222 bun scripts/audit-ui.ts)
(cd apps/tms && TMS_BASE_URL=http://localhost:3425 bun scripts/audit-workflows.ts)
(cd apps/tms && TMS_BASE_URL=http://localhost:3435 TMS_CDP_URL=http://localhost:9222 TMS_AUDIT_MUTATIONS=1 bun scripts/audit-ui.ts)
(cd apps/tms && bun scripts/audit-evidence.ts)
(cd apps/tms && bun run test)
(cd lib && bun run test)
```

The goal remains active until authoritative reference states for the remaining routes are available; full local control-level interaction coverage is now proven.
