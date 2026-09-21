# Functionality evidence

- Deterministic My Company fixture starts at 2 columns.
- Read/options use `ecommerce.read`; the update uses `ecommerce.write` and
  requires optimistic row-version concurrency.
- Values 1, 2, and 3 persist and project to Product Detail; values outside
  the source-backed range are rejected.
- Foreign-company and stale writes are rejected, and missing fixture reads
  return the declared empty object state.
- Migration and fixture replay are idempotent; the selected value survives a
  DuckDB close/reopen.
