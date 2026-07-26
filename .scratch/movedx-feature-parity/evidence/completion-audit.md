# Parity Completion Audit

Audited 2026-07-26 against `.scratch/movedx-feature-parity/PRD.md`.

## Proven

- 68 page YAML definitions load through the authenticated page API.
- 123 server-owned datasource definitions execute successfully on a fresh seeded database.
- 52 registered SPA routes mount in a real browser with zero route-panel or console-error failures.
- Every page YAML has a route-specific evidence directory and controls checklist.
- Every route has local desktop/tablet evidence, including the five provisional legacy pages.
- Every registered SPA path has a page-loader mapping and serves the shell on direct navigation; deep-link 404s are covered by the route audit.
- A disposable fresh-database workflow audit completes 13 representative named transitions across orders, quotes, financial documents, payroll, and trip cancellation.
- Named workflow actions, field allowlists, and audit writes remain server-authorized; framework tests pass 141/141.
- Dashboard period controls match the supplied reference states with segmented `Tháng này`, `Tháng trước`, `Quý này`, `Năm nay`, and `12 tháng` presets at desktop and tablet widths.
- Dashboard KPI information architecture now matches the supplied reference sections, including the seven-card task row, six-card operating/financial/HR rows, and VND financial formatting.
- Operations navigation now exposes all six reference entries and maps each to a registered SPA route.
- The shell reads the seeded company profile through an authenticated server endpoint and renders tenant identity in the header; it is not hard-coded in the client.
- The shared header exposes the reference theme toggle, persists the light/dim preference in browser storage, and renders the authenticated user name beside the profile avatar.
- Dashboard renders a declarative in-page greeting using the authenticated user runtime state.
- Dashboard period state defaults to the selected current-month preset with synchronized date fields and datasource bounds.
- Shared KPI cards use compact reference-density spacing; the dashboard chart heading is visible within the 1440 x 1000 viewport.
- Dashboard includes declarative monthly revenue/cost/profit line data plus trip-status chart data.
- Dashboard chart slots sit side by side at desktop width and wrap naturally at tablet width without document overflow.
- Trip-status chart uses the shared pie variant to match the supplied reference composition.

## Not Proven

- The PRD requires reference desktop/tablet captures for every route. The workspace contains only the eight supplied reference captures (dashboard, orders, customers, and vehicles), so additional reference-state parity cannot be verified from local evidence.
- The PRD asks for automated interaction coverage for every control. The browser audit exercises shared list controls, and the workflow audit covers 13 representative named transitions; exhaustive per-control interaction coverage is still not proven.

## Current commands

```sh
TMS_BASE_URL=http://localhost:3339 bun run audit
TMS_BASE_URL=http://localhost:3339 TMS_CDP_URL=http://localhost:9222 bun run audit:ui
bun run test # from lib/
```

The goal remains active until authoritative reference states and full control-level interaction coverage are available.
