# Functionality evidence

- Deterministic My Company fixtures load `internal_reference` at sequence 10
  and `category` at sequence 20.
- Create, edit, and remove actions require `ecommerce.write`; reads and field
  options require `ecommerce.read`.
- Unsupported field names, invalid sequence values, duplicate selections,
  foreign-company writes, missing records, and stale row versions are
  rejected with explicit guards.
- Product Detail projects the active configured values for the Ceramic Mug;
  inactive or removed selections are not projected.
- Migration and fixture replay are idempotent, and the configuration survives
  DuckDB close/reopen.
