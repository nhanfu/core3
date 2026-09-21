# QA inventory

- Owned implementation paths: migrations 124/125, existing product-document
  API/page contracts, Product Detail document projection, Ecommerce public
  operation/route, and focused/regression tests.
- Required lifecycle coverage: source/controller/template comparison,
  page/API separation, deterministic URL fixture, durable URL CRUD,
  permissions, company/product validation, URL validation, optimistic
  concurrency, idempotent migration, public redirect, and restart persistence.
- Verification: focused and existing document tests pass (5 tests, 62
  assertions); `bun run audit` passes at 738 pages, 747 routes, and 1454
  datasources; scoped ESLint and `git diff --check` pass.
- Scope boundary: no other module files are included; browser/Odoo blockers
  prevent visual parity sign-off.
