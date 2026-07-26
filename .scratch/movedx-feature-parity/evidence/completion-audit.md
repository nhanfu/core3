# Parity Completion Audit

Audited 2026-07-26 against `.scratch/movedx-feature-parity/PRD.md`.

## Proven

- 68 page YAML definitions load through the authenticated page API.
- 153 server-owned datasource definitions execute successfully on a fresh seeded database.
- 52 registered SPA routes mount in a real browser with zero route-panel or console-error failures.
- Sixteen seeded populated detail targets (orders, quotes, financial documents, HR, fleet, organization, area, company settings, print-template, and approval-flow editors) also mount with zero browser failures and assert the expected seeded business identifier in each panel.
- The full browser route/detail matrix passes at an explicit 1024 x 768 tablet viewport with zero document-level horizontal overflow.
- The same browser route matrix reruns at an explicit 1440 x 1000 desktop viewport with zero route, console, or document-overflow failures.
- The browser parity audit exercises every discovered shared control on all 52 routes with zero failures at 1024 x 768, including 321 sortable headers, 142 status tabs, 44 column choosers, 401 row actions dispatched with mutation POSTs blocked, 20 exports, and all discovered search/editor controls.
- List-toolbar Excel exports now refetch the complete active filtered dataset in bounded server pages and emit a dependency-free OOXML workbook; explicit CSV fallback remains available.
- Every page YAML has a route-specific evidence directory and controls checklist.
- Every route has local desktop/tablet evidence, including the five provisional legacy pages.
- Every registered SPA path has a page-loader mapping and serves the shell on direct navigation; deep-link 404s are covered by the route audit.
- A disposable fresh-database action audit completes 29 named transitions, 6 invalid-transition rejection checks, 3 invalid-payload validation checks, one master-data create/update/delete round-trip, one malformed-import rejection, and a least-privilege `403` check.
- Named workflow actions, field allowlists, and audit writes remain server-authorized; framework tests pass 151/151.
- Dashboard period controls match the supplied reference states with segmented `Tháng này`, `Tháng trước`, `Quý này`, `Năm nay`, and `12 tháng` presets at desktop and tablet widths.
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
- Dashboard toolbar now matches the reference search and CSV-export controls, with server-backed dispatch search fields.
- Shared KPI cards use compact reference-density spacing; the dashboard chart heading is visible within the 1440 x 1000 viewport.
- Dashboard includes declarative monthly revenue/cost/profit line data plus trip-status chart data.
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
- Area, department, and ledger-account grids now render hierarchy depth indentation from their persisted parent relationships.
- Departments now support a persisted parent relationship, parent display, and ancestor-walking cycle validation.
- Department create/edit forms now use a branch lookup instead of free-form branch IDs.
- Quote create/edit forms now use a customer lookup preserving legacy quote customer values.
- Shift assignment and timesheet forms now use employee and shift lookup selectors instead of raw IDs.
- Payroll create/edit forms now use an employee lookup selector instead of a raw employee ID.
- Payroll detail editors now use the same employee lookup selector instead of a raw employee ID.
- Contract list and detail editors now use employee lookup selectors instead of raw employee IDs.
- Container create/edit forms now use a location lookup selector instead of a raw location ID.
- Container forms now source container types from catalog master data while preserving existing type codes.
- User create/edit forms now support native multi-select role assignment backed by the role lookup datasource.
- Order create/edit forms now use a customer lookup sourced from active CRM customers instead of free-form names.
- Vehicle forms now use a branch lookup, and driver forms use a vehicle lookup, replacing raw internal IDs.
- Advances now calculate linked settlement and outstanding amounts, while settlements expose a validated linked-advance selector and reference column; workflow audit covers invalid-link rejection.
- Invoice template create/edit forms now use the shared rich-text token picker for invoice number, customer, total, and tax placeholders.
- Ledger accounts now support persisted parent relationships, parent display, datasource-backed parent selection, and server-side self-parent validation.
- An opt-in fresh-browser mutation audit performs normal pointer clicks for `submit_order` and `approve_order`, then verifies the order row persists `Pending Approval` and `Approved`; it passes with zero UI mutation failures.

## Not Proven

- The PRD requires reference desktop/tablet captures for every route. The workspace contains only the eight supplied reference captures (dashboard, orders, customers, and vehicles), so additional reference-state parity cannot be verified from local evidence.
- The PRD asks for automated interaction coverage for every control. The browser audit now exercises every discovered shared status tab, sortable header, chooser, pagination control, page-size selector, search, editor opener, export, and row action per route (52 routes plus 16 populated details, 0 failures; 321 sortable headers, 142 tabs, 44 choosers, 401 row actions, 20 exports). Named workflow coverage spans every registered workflow transition shape, and the opt-in fresh-browser mutation phase verifies submit/approve persistence through normal UI clicks.

## Current commands

```sh
(cd apps/tms && TMS_BASE_URL=http://localhost:3339 bun run audit)
(cd apps/tms && TMS_BASE_URL=http://localhost:3339 TMS_CDP_URL=http://localhost:9222 bun run audit:ui)
# The browser audit also accepts an isolated seeded server, for example:
# TMS_DB_PATH=/tmp/core3-parity-3419.duckdb TMS_UPLOAD_ROOT=/tmp/core3-uploads-3419 PORT=3419 bun server.ts
# (cd apps/tms && TMS_BASE_URL=http://localhost:3419 TMS_CDP_URL=http://localhost:9222 bun scripts/audit-ui.ts)
(cd apps/tms && TMS_BASE_URL=http://localhost:3425 bun scripts/audit-workflows.ts)
(cd apps/tms && TMS_BASE_URL=http://localhost:3435 TMS_CDP_URL=http://localhost:9222 TMS_AUDIT_MUTATIONS=1 bun scripts/audit-ui.ts)
(cd lib && bun run test)
```

The goal remains active until authoritative reference states and full control-level interaction coverage are available.
