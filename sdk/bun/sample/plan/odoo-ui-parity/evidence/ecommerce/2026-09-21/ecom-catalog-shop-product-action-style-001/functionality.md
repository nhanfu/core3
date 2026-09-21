# Functionality evidence

- Deterministic My Company fixture starts with the Subtle action style,
  matching Odoo's default class list.
- Policy/options reads use `ecommerce.read`; the update uses
  `ecommerce.write` and requires optimistic row-version concurrency.
- The form switches among the three source-backed styles and the effective
  setting is projected by the Shop API.
- Unsupported values, foreign-company writes, stale replays, and missing
  fixture reads are rejected or represented by the declared contract state.
- Migration and fixture replay are idempotent; the selected value survives a
  DuckDB close/reopen.
