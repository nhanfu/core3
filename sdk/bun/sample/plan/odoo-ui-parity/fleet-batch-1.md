# Fleet parity batch 1: vehicles

Status: implemented in Core3; Odoo visual reference unavailable.

This batch covers the Fleet vehicle entry surface: `/vehicles` with the shared
ListView list mode, status/type/archive filters, deterministic search and
ordering, model/brand/status/fuel grouping, shared Kanban mode, row navigation,
side-panel OdooFormView detail, create form, and the existing assign,
maintenance, release, and manager-only retire workflow states. The Fleet
analysis page remains available with service-owned datasources.

All vehicle reads, the vehicle detail read, analysis reads, navigation/create
actions, and workflow action bindings are convention-discovered from
`services/fleet/api/*.yaml`; frontend page YAML contains presentation only.
The vehicle migration uses stable IDs, the seeded date `2026-01-15`, idempotent
upserts, explicit state metadata, and active/archive/type fields.

Deferred: odometers, contracts, services, models/brands/categories/tags,
settings, activities/chatter, reporting graphs/pivots, multi-company and
employee/Auth relational operations. These remain planned Fleet surfaces and
are not represented as completed parity in this batch.

The live Odoo 19 Fleet addon is uninstalled in `core3_demo`; `/odoo/fleet`
redirects to Discuss and has no Fleet menus, views, or demo rows. Therefore no
Odoo Fleet screenshot is fabricated or used as visual evidence. Core3 captures
are the only parity screenshots for this batch and are kept under `/tmp`.
