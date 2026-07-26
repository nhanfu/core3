# Parity Completion Audit

Audited 2026-07-26 against `.scratch/movedx-feature-parity/PRD.md`.

## Proven

- 68 page YAML definitions load through the authenticated page API.
- 123 server-owned datasource definitions execute successfully on a fresh seeded database.
- 52 registered SPA routes mount in a real browser with zero route-panel or console-error failures.
- The browser parity audit exercises every discovered shared control on all 52 routes with zero failures, including 317 sortable headers, 142 status tabs, 44 column choosers, 401 row actions dispatched with mutation POSTs blocked, 39 exports, and all discovered search/editor controls.
- List-toolbar CSV exports now refetch the complete active filtered dataset in bounded server pages instead of exporting only the visible page.
- Every page YAML has a route-specific evidence directory and controls checklist.
- Every route has local desktop/tablet evidence, including the five provisional legacy pages.
- Every registered SPA path has a page-loader mapping and serves the shell on direct navigation; deep-link 404s are covered by the route audit.
- A disposable fresh-database workflow audit completes 29 named transitions across every order, quote, financial-document, payroll, and trip workflow transition shape.
- Named workflow actions, field allowlists, and audit writes remain server-authorized; framework tests pass 150/150.
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

## Not Proven

- The PRD requires reference desktop/tablet captures for every route. The workspace contains only the eight supplied reference captures (dashboard, orders, customers, and vehicles), so additional reference-state parity cannot be verified from local evidence.
- The PRD asks for automated interaction coverage for every control. The browser audit now exercises every discovered shared status tab, sortable header, chooser, pagination control, page-size selector, search, editor opener, export, and row action per route (52 routes, 0 failures; 317 sortable headers, 142 tabs, 44 choosers, 401 row actions, 39 exports). Named workflow coverage spans every registered workflow transition shape; full server-side mutation effects and detail-only permutations still need broader UI-level checks.

## Current commands

```sh
(cd apps/tms && TMS_BASE_URL=http://localhost:3339 bun run audit)
(cd apps/tms && TMS_BASE_URL=http://localhost:3339 TMS_CDP_URL=http://localhost:9222 bun run audit:ui)
(cd lib && bun run test)
```

The goal remains active until authoritative reference states and full control-level interaction coverage are available.
