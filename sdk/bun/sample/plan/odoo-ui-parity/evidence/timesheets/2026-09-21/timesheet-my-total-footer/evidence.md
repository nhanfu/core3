# `TIMESHEET-MY-TOTAL-FOOTER-001` evidence

Captured 2026-09-21 with authenticated Chromium at 1440x900 and 390x844.

## Source and Odoo comparison

Odoo's `hr_timesheet_line_tree` declares the `unit_amount` Time Spent field
with `sum="Total"`. `odoo-desktop.png` and `results.json` show authenticated
`codex@core3.local` on `/odoo/timesheets`; the rendered list ends with the
source total `127:00`. The mobile Kanban is authenticated and renders the
same timesheet cards, but the list footer aggregate is not exposed in that
responsive state. Aborted mobile avatar/action requests are recorded in
`results.json` and did not prevent rendering.

## Core3 status

Core3 browser capture is blocked before login: `bun dev --db=ddb --memory`
started Vite on port 3002 but did not expose backend port 3001 during the
bounded readiness check. `core3-blocker.json` records the exact runtime
boundary; no Core3 screenshot or browser parity claim is fabricated.

Focused repository tests prove the page/API separation, filter-aware durable
total, permission/company/empty/transport guards, stale concurrency, and
file-backed restart persistence.

Existing Odoo Print/PDF/action and broader route/action comparison blockers
remain open; this bounded feature is not Timesheets module sign-off.
