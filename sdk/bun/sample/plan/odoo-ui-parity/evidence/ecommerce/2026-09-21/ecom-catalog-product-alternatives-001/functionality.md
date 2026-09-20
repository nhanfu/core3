# Functional evidence

- Migrations 066/067 replay without duplicate rows and seed two ordered Mug
  recommendations: Chair then Lamp.
- The recommendation query returns only published active same-company targets;
  an Other Company scope returns no rows.
- Wrong-company assignment, unpublished target, and duplicate assignment are
  rejected before persistence.
- A valid Chair → Lamp assignment returns the destination metadata and can be
  removed only with the current row version; stale removal leaves the row.
- Closing and reopening DuckDB preserves the created relation, sequence, and
  row version alongside the deterministic fixtures.

The focused proof is service/API and persistence evidence. It does not claim a
rendered browser pass or full Ecommerce sign-off.
