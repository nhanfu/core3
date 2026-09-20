# Functional evidence

- Migration replay is idempotent and seeds deterministic Accessories category
  HTML content.
- Category Detail reads the persisted description through its API datasource
  and binds it to the page's rich-text group.
- Ecommerce-write updates replace content, and an empty value clears it to
  NULL while advancing the row version.
- Wrong-company, unsafe script, over-length, inactive, and stale-row requests
  are rejected without overwriting category content.
- Reopening DuckDB preserves description HTML and row version.
