# Functional evidence

- Migrations 080/081 replay without duplicate changes and seed the deterministic
  Mug website description.
- Products, Shop, and Product Detail return the persisted description, and
  Products/Shop search matches description content alongside name/category.
- A valid Product Detail edit persists rich-text content and increments the
  product row version.
- Empty content is allowed; script-tag content and descriptions over 10,000
  characters are rejected; wrong-company and stale writes do not change data.
- Closing and reopening file-backed DuckDB preserves description content and
  row version after migration replay.

The focused proof is service/API and persistence evidence. It does not claim
a rendered browser pass or full Ecommerce sign-off.
