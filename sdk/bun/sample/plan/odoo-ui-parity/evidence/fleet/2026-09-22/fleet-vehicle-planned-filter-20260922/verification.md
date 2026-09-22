# Verification

The page/API contract was discovered through the repository YAML loader and
exercised against DuckDB migrations. The deterministic City Bike 02 fixture is
returned by the planned filter, a Car-only planned query is empty, migration
replay does not duplicate state, and Apply New Driver removes the row from the
planned result while incrementing its row version.

The authenticated reference visual gate remains blocked by the requested
`core3_reference` Odoo route having no Fleet application. The exact BrowserSkill
borrow and route results are recorded in `browser-check.md`.
