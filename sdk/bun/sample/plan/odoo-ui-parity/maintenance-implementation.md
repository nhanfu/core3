# Maintenance parity batch 1

Implemented in the isolated `odoo-ui-maintenance-impl` worktree from main
`5fa3e03`.

## Scope

- Requests: deterministic search, status/priority/archive filters, group-by,
  list and shared kanban views, create action, row navigation, and request
  form/detail states.
- Equipment: deterministic name/model/serial/vendor search, status filter,
  group-by, list and shared kanban views, manager create action, row
  navigation, and equipment form/detail states.
- Backend reads, lookups, create mutations, and detail actions now live in
  convention-discovered `services/maintenance/api/*.yaml` fragments keyed by
  `page.id`; page YAML contains presentation only.
- Migrations now use stable IDs, the seeded date `2026-01-15`, explicit
  ordering, idempotent `ON CONFLICT` inserts, request stages, teams,
  categories, active/archived equipment, multiple request states, recurrence,
  and a second company fixture.

## Deliberate deferrals

Dashboard context cards, calendar/activity/pivot/graph reporting, teams,
categories, settings, followers/chatter/attachments, and full CRUD/permission
mutation coverage are deferred to the next coherent batch. The Analysis menu
remains a deliberate empty route rather than implying unsupported reporting.

Live Odoo maintenance evidence is unavailable: the authenticated reference
database reports the `maintenance` addon as uninstalled. No Odoo screenshot is
claimed or fabricated. Core3 screenshots, when captured, are verification
evidence only and do not represent Odoo parity evidence.

## Verification record

- `bun run audit` passes after integration: 253 pages, 256 routes, and 463
  datasources.
- `bun run frontend:build` reaches the existing repository-wide CSS build but
  is blocked by the pre-existing missing
  `services/ecommerce/styles/index.scss` path.
- `git diff --check` passes.
- Authenticated Core3 browser checks passed for requests, equipment, and both
  detail routes at 1440x900 and 390x844 with no failed requests or horizontal
  overflow. Captures are under `/tmp/core3-timesheets-maintenance/`; image
  files are intentionally excluded from the commit.
