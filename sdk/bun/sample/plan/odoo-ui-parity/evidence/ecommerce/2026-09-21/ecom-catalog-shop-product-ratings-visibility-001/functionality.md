# Functionality evidence

- Deterministic My Company fixture starts with product-card ratings hidden,
  matching the supplied Odoo default class list.
- Policy and Shop reads use `ecommerce.read`; the update uses
  `ecommerce.write` and requires optimistic row-version concurrency.
- The form shows/hides Shop ratings and the Shop API projects the effective
  setting plus the published active review average/count.
- Invalid values, foreign-company writes, stale replays, and missing fixture
  reads are rejected or represented by the declared contract state.
- Migration and fixture replay are idempotent; the selected value survives a
  DuckDB close/reopen.
