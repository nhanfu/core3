# Functional evidence

- Migration replay seeds deterministic Mug SEO metadata and computes the
  optimized state only when title, description, and keywords are all present.
- Product Detail exposes an Ecommerce-write-protected SEO Metadata form and
  persists title, description, keywords, and OpenGraph image path together.
- Clearing a required optimization field returns `is_seo_optimized` to false;
  blank optional OpenGraph paths are stored as null.
- Wrong-company, stale-row, inactive-row, over-length, and unsafe-URL inputs
  are rejected without overwriting the product.
- Reopening DuckDB after migration replay preserves all SEO values and the
  row version.
