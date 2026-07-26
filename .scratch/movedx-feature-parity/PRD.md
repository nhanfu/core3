# MovedX feature-parity roadmap

This roadmap is based on a read-only audit of the supplied MovedX tenant on
2026-07-26. It is intentionally incremental: each slice must add reusable
framework support and a working TMS workflow, rather than static lookalike
screens.

## Reference capability map

1. Dashboard: date-range KPIs, queues, charts, exportable ranking tables.
2. Operations: orders, chat, scheduling, dispatch and trip state.
3. Sales: customers, partners, quotes, CRM dashboard and KPI reporting.
4. Accounting: debit notes, payment requests, advances, settlements, invoice
   templates and ledger accounts.
5. HR: employees, contracts, timesheets, shifts and payroll.
6. Catalog/fleet: drivers, vehicles, containers, locations, areas and typed
   master data.
7. Organization/system: company structure, RBAC, audit log, code rules, print
   templates, approval flows and configurable status/rules.

## Reusable component sequence

| Slice | Shared component capability | First TMS use |
| --- | --- | --- |
| 1 | Declarative dashboard chart binding | Dashboard trip-status overview |
| 2 | Resource-list toolbar: search, status tabs, sort, columns, import/export | Orders and customers |
| 3 | Async relational lookup, date/time and attachment inputs | Order and quote editors |
| 4 | Detail drawer, activity timeline and status transitions | Order-to-trip dispatch |
| 5 | Line-item editor, currency totals and approval timeline | Debit notes and payment requests |
| 6 | Audit log, rule builder and template token editor | System configuration |

## Slice 1 acceptance criteria

- Dashboard is the authenticated landing route.
- KPIs, a status chart and the active dispatch queue read real local TMS data.
- `Chart` is usable from YAML through `page-renderer`, with label/value field
  mapping and an empty-state.
- Existing fleet, driver, trip, maintenance, report and settings routes remain
  available.
