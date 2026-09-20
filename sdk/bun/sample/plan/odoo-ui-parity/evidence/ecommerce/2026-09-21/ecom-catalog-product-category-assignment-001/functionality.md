# Functionality evidence

Deterministic fixture reads:

- Core3 Ceramic Mug: Accessories at sequence 10 and Office at sequence 20.
- Ergonomic Office Chair: Office at sequence 10.

The focused integration suite proves:

- Odoo source/menu/action tracing and Product Detail page/API pairing;
- read source and write action permission declarations;
- assignment options exclude already assigned active categories;
- wrong-company products and inactive categories are rejected;
- duplicate assignments return `409 ECOMMERCE_PRODUCT_CATEGORY_EXISTS`;
- negative ordering returns `422 ECOMMERCE_PRODUCT_CATEGORY_SEQUENCE_INVALID`;
- edit/remove use row-version concurrency and preserve current data on stale
  writes;
- migration replay and DuckDB restart preserve assignments.
