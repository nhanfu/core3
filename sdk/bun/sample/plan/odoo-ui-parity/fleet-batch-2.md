# Fleet parity batch 2: Odometers

Status: implemented in the isolated Fleet worktree; commit recorded in the
handoff for this batch.

This bounded batch closes the Odoo `Fleet > Odometers` action while preserving
the existing `/vehicles`, `/fleet-analysis`, and vehicle workflow aliases. It
adds the Odoo action's `List`, `Form`, and `Graph` modes, the Date/Vehicle/
Driver/Odometer Value/Unit columns, Vehicle and Date grouping metadata, a
service-owned detail form, deterministic DuckDB/Postgres migration fixtures,
create/edit relation validation, empty and transport-error fixtures, and
desktop/mobile evidence.

Reference: Odoo 19 Fleet is installed with demo data in `core3_reference`.
The authenticated captures are `/tmp/odoo-fleet-odometers-desktop.png` and
`/tmp/odoo-fleet-odometers-mobile.png`; they are not committed.

Core3 captures are `/tmp/core3-fleet-odometers-list-desktop-final.png`,
`/tmp/core3-fleet-odometers-mobile.png`,
`/tmp/core3-fleet-odometers-graph-desktop.png`,
`/tmp/core3-fleet-odometers-empty-mobile.png`, and
`/tmp/core3-fleet-odometer-detail-desktop.png`; they are not committed.

Deferred from this batch: Odometer Analysis reporting, contracts, services,
models/brands/categories/tags, settings, activities/chatter, multi-company
scope, and Auth-backed employee relation operations. These remain explicit
Fleet plan work rather than being represented as complete parity.
