# Functional evidence

- Migrations 074/075 replay without duplicate rows and seed
  `ecommerce-variant-image-mug-blue` for the deterministic Mug Blue variant.
- The variant-media query returns the fixture in My Company and no rows under
  an Other Company scope.
- Wrong-company upload, non-image upload, duplicate filename, stale variant
  upload, inactive/missing variant, and oversized/empty file paths are guarded
  before persistence.
- A valid upload stores the variant/product relationship and increments the
  variant row version; removal requires the current image row version and
  deletes only the selected media row.
- Closing and reopening DuckDB preserves the uploaded image metadata, fixture,
  and variant row version after migration replay.

The focused proof is service/API and persistence evidence. It does not claim a
rendered browser pass or full Ecommerce sign-off.
