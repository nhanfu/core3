# Odoo UI parity — shared screen mock-data contract

This contract applies to every Odoo-parity screen until a real service query is
explicitly introduced. It keeps page YAML presentation-only and makes fixture
data replaceable without changing the screen layout or route contract.

## Ownership and discovery

- A frontend page declares layout, labels, view modes, route parameters, and
  the visible action wiring only.
- Every datasource belongs in `services/<module>/api/` and is discovered by the
  matching `page.id`. API fragments own queries, `mock_data`, mutations, and
  response-state metadata; they must not be listed as frontend pages.
- Relation choices, counts, status transitions, permissions, and error
  responses are service-owned. Page-local arrays, browser fixtures, remote
  calls, and embedded SQL are not acceptable parity data sources.
- A datasource may replace `mock_data` with a real query later without changing
  its page id, route, field contract, or component structure.

## Required fixture modes

Every visible list, form, kanban, calendar, activity, chart, graph, pivot,
dashboard, wizard, public form, live session, and empty state declares stable
fixtures for the states it exposes:

| Mode | Purpose | Required response behavior |
| --- | --- | --- |
| `default` | Populated Odoo-shaped state | Stable records, ordering, labels, totals, and relations |
| `filtered` | Search, date, status, company, or group result | Same schema with deterministic bounded result set |
| `empty` | Valid query with no records | Explicit empty copy and no fabricated rows |
| `error` | Service/database failure | Stable transport status, code, and user-facing retry copy |
| `forbidden` | Authenticated user without source permission | Server-side `403` and no protected records |

Forms and row actions additionally cover `not_found` (`404`), stale writes
(`409` with the current row version), and invalid input (`422` with field-level
messages). Unauthenticated requests return `401`. A screen may document a
deliberate omission when a source action has no ordinary user-facing view.

## Determinism rules

- Use seed date `2026-01-15`, fixed IDs, fixed row versions, fixed names, and
  explicit ordering. Relative dates must be derived from that seed, not the
  process clock.
- Do not use `CURRENT_DATE`, `CURRENT_TIMESTAMP`, random UUIDs, generated
  browser IDs, unstable ordering, remote assets, or live Odoo requests in
  fixtures.
- Migrations are idempotent on fresh install and upgrade. Rerunning a migration
  must preserve the same IDs, row versions, counts, and order.
- Include realistic Odoo-shaped density and relationships, including active
  and archived rows, scoped companies/users, empty search results, and records
  that exercise protected-delete and invalid-transition guards.
- Mock data must be safe for desktop and 390px mobile captures: long labels,
  status text, totals, and relation names must exercise wrapping without
  requiring horizontal page overflow.

## Acceptance evidence

Focused tests must prove page/API ownership, fixture idempotency, default and
filtered results, empty and transport-error states, permission filtering, and
the applicable `401/403/404/409/422` contracts. Authenticated browser checks
must navigate through the module menu and capture the corresponding Odoo and
Core3 states at `1440x900` and `390x844`; screenshots stay under `/tmp` and are
never committed.
