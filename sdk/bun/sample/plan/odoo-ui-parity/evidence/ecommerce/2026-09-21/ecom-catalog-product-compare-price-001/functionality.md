# Functional evidence

- Migrations 078/079 replay without duplicate changes and seed deterministic
  product and variant compare-at prices.
- Product list, Shop, Product Detail, and Variant Detail sources return the
  stored value plus `compare_at_price` only when it is greater than the current
  sales price; a zero value hides the comparison price.
- A valid product edit and variant compare-price update persist the value and
  increment the row version.
- Negative values, wrong-company writes, and stale row versions are rejected
  without partial updates.
- Closing and reopening file-backed DuckDB preserves product/variant values
  and derived display inputs after migration replay.

The focused proof is service/API and persistence evidence. It does not claim
a rendered browser pass or full Ecommerce sign-off.
