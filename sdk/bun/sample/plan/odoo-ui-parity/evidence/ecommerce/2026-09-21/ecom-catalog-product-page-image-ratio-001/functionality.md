# Functionality

- Deterministic `My Company` fixture starts at desktop `1_1` and mobile
  `auto`.
- Both values can be updated together with `ecommerce.write` and a required
  row version; unsupported values return a validation error.
- Foreign-company and stale row-version updates are rejected without a
  durable mutation.
- Product Detail projects the effective company policy with human-readable
  desktop/mobile labels.
- Replaying migrations is idempotent, and values survive a DuckDB close and
  reopen.
