# Maintenance dashboard state-action evidence — 2026-09-21

## Source and live reference

- Odoo source: `/home/nhanjs/projects/odoo/addons/maintenance/views/maintenance_views.xml`,
  `maintenance_team_kanban`; the card conditionally exposes To Do, Scheduled,
  Top Priorities, Blocked, and Unscheduled request actions.
- Authenticated reference: `http://localhost:8069/odoo/maintenance`, database
  `core3_reference`, shared browser instance `245ea108`, agent-owned bsk session.
- Live reference observation: the Internal Maintenance card showed `3 To Do`
  and `3 Unscheduled`; the team-card action contract was verified against the
  source because zero-count actions are hidden in the live data.

## Core3 implementation evidence

- Page/API join is `maintenance-dashboard` for dashboard and `maintenance-requests`
  for the filtered target. The new actions are read-only and permissioned by
  `maintenance.read`.
- The deterministic persisted fixture has one active Subcontractor request
  with `kanban_state=blocked` and `scheduled_date IS NULL`; service tests also
  verify the same result after closing and reopening a file-backed DuckDB.
- Authenticated Core3 desktop dashboard rendered at 1440x900 before the runner
  terminated. The card showed `1 Blocked` and `1 Unscheduled` for Subcontractor.

## Captures (temporary, never committed)

| Surface | Path | Viewport | SHA-256 |
| --- | --- | --- | --- |
| Odoo dashboard | `/tmp/core3-odoo-parity/maintenance-dashboard-state-20260921/odoo-dashboard-viewport-1440x900.png` | 1440x900 | `15450c43b212adb9660f368ec0fd91e8b3cb76a7c2630347ab1f8fea50360461` |
| Odoo dashboard | `/tmp/core3-odoo-parity/maintenance-dashboard-state-20260921/odoo-dashboard-mobile-390x844.png` | 390x844 | `eee9a8a48f447b05e05a3c9fa87e23cd3f140c4b30a80f6da018d9148e5e1128` |
| Core3 dashboard | `/tmp/core3-odoo-parity/maintenance-dashboard-state-20260921/core3-dashboard-viewport-1440x900.png` | 1440x900 | `6f7e4ccd5f267090675cdd0b703771ade8378fc7f7e3b893bd243fa82ee523f4` |
| Core3 Subcontractor card | `/tmp/core3-odoo-parity/maintenance-dashboard-state-20260921/core3-subcontractor-card.png` | 465x233 element | `f63dd6fc810a5fc69ba1a8948417df8f20e1ad48c4f2245589733574adefe103` |

## Browser blocker

The isolated Core3 runner was started with `CORE3_MODULES=maintenance` and
failed before serving the filtered route because global page discovery still
reads all modules and encountered an unrelated dirty Order error:

`Duplicate datasource id "sale_quotation_templates" in services/order/pages/sale-quotations.yaml`.

This was not changed or staged. Consequently there is no authenticated Core3
mobile capture or claim that the clicked filtered route completed in the live
runner. Odoo mobile evidence and Core3 authenticated desktop rendering remain
valid; service-level filtered-route and restart evidence is covered by the
focused test.
