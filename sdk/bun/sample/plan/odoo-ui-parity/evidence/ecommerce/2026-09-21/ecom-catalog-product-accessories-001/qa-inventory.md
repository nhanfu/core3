# QA inventory

- Focused integration: 3 tests, 27 assertions, 0 failures.
- Adjacent Ecommerce regression: 17 tests, 120 assertions, 0 failures across
  accessories, product detail, cart, variants, and alternatives.
- YAML UI audit: passed; 693 pages, 702 routes, and 1300 datasources were
  discovered.
- Scoped ESLint: new accessory and updated Cart integration tests pass.
- `git diff --check`: pass.
- Temporary database files: removed by the restart test cleanup.

The exact command output is recorded in `test-results.md` after final
verification.
