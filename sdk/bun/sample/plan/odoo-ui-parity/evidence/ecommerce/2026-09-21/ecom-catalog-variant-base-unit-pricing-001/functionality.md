# Functional evidence

- Migrations 076/077 replay without duplicate changes and seed the deterministic
  Mug Blue base-unit values.
- Product Detail and Variant detail resolve the same-company variant and
  calculate `sales_price / base_unit_count` when count is positive.
- A wrong-company update, negative count, overlong unit name, and stale row
  version are rejected before changing the variant.
- A valid update persists the count/name and increments the variant row
  version; setting count to zero persists the hide boundary and returns no
  derived unit price.
- Closing and reopening DuckDB preserves the unit metadata, sales price,
  derived calculation inputs, and row version after migration replay.

The focused proof is service/API and persistence evidence. It does not claim a
rendered browser pass or full Ecommerce sign-off.
