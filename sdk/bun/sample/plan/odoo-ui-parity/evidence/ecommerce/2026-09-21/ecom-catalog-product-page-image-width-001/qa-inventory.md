# QA inventory

- Owned implementation paths: migrations 128/129, width policy API/page,
  Product Detail projection/page binding, manifest menu, and focused test.
- Required lifecycle coverage: source/template comparison, page/API
  separation, deterministic fixture, durable CRUD, permissions, company and
  invalid-value validation, optimistic concurrency, Product Detail
  projection, idempotent migration, and restart persistence.
- Verification: focused tests pass; the width/layout/ratio/Product Detail
  regression passes (11 tests, 103 assertions); `bun run audit` passes at 743
  pages, 752 routes, and 1472 datasources; scoped ESLint and
  `git diff --check` pass.
- Scope boundary: no other module files are included; browser/Odoo blockers
  prevent visual parity sign-off.
