# Functionality

- Deterministic `My Company` fixture starts with Carousel.
- Carousel and Grid are exposed as the only layout choices.
- The permissioned update changes the durable company policy with a required
  row version and rejects unsupported values.
- Foreign-company and stale writes are rejected without mutation.
- Product Detail projects the effective company layout with a human-readable
  label.
- Migration replay is idempotent, and the selected layout survives DuckDB
  close and reopen.
