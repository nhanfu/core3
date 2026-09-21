# QA inventory

- Owned implementation paths: migrations 122/123, policy API/page YAML,
  Product Detail projection/page binding, manifest menu, and focused test.
- Required lifecycle coverage: source comparison, page/API separation,
  deterministic fixture, durable CRUD, permissions, company validation,
  invalid-value validation, optimistic concurrency, idempotent migration,
  Product Detail projection, and restart persistence.
- Verification: focused tests and Product Detail regression pass (7 tests, 53
  assertions); `bun run audit` passes at 737 pages, 746 routes, and 1449
  datasources; scoped ESLint and `git diff --check` pass.
- Known boundary: the existing Products integration test still rejects two
  unsupported search keys during page discovery; this slice does not alter
  that contract.
- Scope boundary: no other module files are included; browser/Odoo blockers
  prevent visual parity sign-off.
