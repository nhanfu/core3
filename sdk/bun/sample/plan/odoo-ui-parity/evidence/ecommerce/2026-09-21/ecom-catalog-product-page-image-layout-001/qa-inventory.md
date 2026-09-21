# QA inventory

- Owned implementation paths: migrations 126/127, layout policy API/page,
  Product Detail projection/page binding, manifest menu, and focused test.
- Required lifecycle coverage: source/template comparison, page/API
  separation, deterministic fixture, durable CRUD, permissions, company and
  invalid-value validation, optimistic concurrency, Product Detail
  projection, idempotent migration, and restart persistence.
- Verification: focused tests pass; the layout/image-ratio/Product Detail
  regression passes (9 tests, 78 assertions); `bun run audit` passes at 739
  pages, 748 routes, and 1458 datasources; scoped ESLint and
  `git diff --check` pass.
- Scope boundary: no other module files are included; browser/Odoo blockers
  prevent visual parity sign-off.
