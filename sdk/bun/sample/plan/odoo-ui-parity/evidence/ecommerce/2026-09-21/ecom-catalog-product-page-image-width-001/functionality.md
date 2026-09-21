# Functionality

- Deterministic `My Company` fixture starts at 50% width.
- Hidden, 33%, 50%, 66%, and 100% are exposed as the only width choices.
- The permissioned update changes the durable company policy with a required
  row version and rejects unsupported values.
- Foreign-company and stale writes are rejected without mutation.
- Product Detail projects the effective company width with a human-readable
  label.
- Migration replay is idempotent, and the selected width survives DuckDB
  close and reopen.
