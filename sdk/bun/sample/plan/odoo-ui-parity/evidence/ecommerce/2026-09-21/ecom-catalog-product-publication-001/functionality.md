# Functional evidence

- Deterministic published fixtures have stable publication timestamps; the
  unpublished setup service starts with no timestamp.
- Publish sets `is_published = TRUE`, records a timestamp once, increments
  `row_version`, and makes the active product visible in the public Shop
  projection.
- Unpublish clears the timestamp, increments `row_version`, and removes the
  product from Shop without deleting product data.
- Wrong-company, stale-row, inactive-product, and missing-write-permission
  boundaries are explicit; no stale action can overwrite a newer state.
- Migration replay and DuckDB reopen preserve publication state, timestamp,
  and row version.
