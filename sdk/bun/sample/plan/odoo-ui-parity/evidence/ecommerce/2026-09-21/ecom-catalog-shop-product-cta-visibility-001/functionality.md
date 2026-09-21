# Functionality evidence

- Deterministic My Company fixture starts with the product-card Add to Cart
  CTA visible, matching Odoo's default class list.
- Policy reads use `ecommerce.read`; the update uses `ecommerce.write` and
  requires optimistic row-version concurrency.
- The checkbox can be changed to hide the CTA, the effective setting is
  projected by the Shop API, and it is restored through the same action.
- Invalid values, foreign-company writes, stale replays, and missing fixture
  reads are rejected or represented by the declared contract state.
- Migration and fixture replay are idempotent; the selected value survives a
  DuckDB close/reopen.
