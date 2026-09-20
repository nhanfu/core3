# Verification

## Core3

- Runtime: `http://127.0.0.1:4541`.
- Actor: authenticated `admin@tms.local`.
- Route: `/inventory/stock-report`.
- Desktop 1440x900: initial context 2026-01-15; modal submitted 2026-01-14
  (empty result), then 2026-01-16 (10 rows); reload retained 2026-01-16 and
  10 rows. Page and mutation responses were HTTP 200, failed requests were
  empty, and document/client/inner widths were all 1440.
- Mobile 390x844: modal submitted 2026-01-16; reload retained 2026-01-16 and
  10 rows. Responses were HTTP 200, failed requests were empty, and widths were
  all 390.
- Raw facts and request lists: `core3.json`.

## Odoo

- Actor: authenticated `codex@core3.local`.
- Route: `http://127.0.0.1:8069/odoo/stock-report`.
- Desktop 1440x900 rendered the Stock report and opened the Inventory at Date
  wizard. Mobile 390x844 rendered the Stock report with no horizontal overflow
  or failed requests, but the date control was not present in the responsive
  action surface. No Odoo write was made.
- Raw controls, text, URLs, widths, and request failures: `odoo.json`.

This is a bounded report-context handoff, not full Inventory sign-off.
