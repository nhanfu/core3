# Functionality evidence

The deterministic fixture reads as:

- Core3 Ceramic Mug: `website_size_x = 2`, `website_size_y = 1`.
- Ergonomic Office Chair: `website_size_x = 1`, `website_size_y = 2`.

The focused integration suite proves:

- page/API `page.id` joins for Products, Shop, and Product Detail;
- API/page schema validation with page-local and API actions combined;
- authenticated write permission declaration;
- wrong-company `403 ECOMMERCE_COMPANY_SCOPE_REQUIRED` rejection;
- range validation with `422 ECOMMERCE_PRODUCT_DISPLAY_DIMENSIONS_INVALID`;
- create/update persistence and optimistic stale-write rejection;
- migration replay and DuckDB restart persistence.
