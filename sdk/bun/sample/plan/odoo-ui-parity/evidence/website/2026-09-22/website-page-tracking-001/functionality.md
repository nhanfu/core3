# Functionality evidence

- Fixtures: Home and Docs Home are tracked; Contact us is untracked and not
  SEO optimized.
- Filter results: tracked returns Home/Docs Home; not tracked returns Contact
  us; not SEO optimized returns Docs Home/Contact us.
- Mutation: Website editor changes Contact us to tracked, increments row
  version `1 → 2`, and stale replay is rejected with HTTP 409 semantics.
- Permission: a `website.read` actor receives HTTP 403 for the write action and
  the database row remains tracked.
- Durability: running the Website migrations twice is idempotent; a file-backed
  DuckDB close/reopen preserves `track=true` and `row_version=2`.
