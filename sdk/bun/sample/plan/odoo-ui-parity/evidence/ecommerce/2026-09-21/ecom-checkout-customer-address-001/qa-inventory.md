# QA inventory

- Focused address + checkout regression: 21 tests, 136 assertions, 0 failures.
- YAML UI audit: passed — 694 pages, 703 routes, and 1304 datasources after
  adding the Checkout address ListView and API datasource.
- Scoped ESLint: new address integration test passes.
- `git diff --check`: pass.
- Temporary DuckDB restart files: removed by test cleanup.

Authenticated Core3 desktop/mobile and paired Odoo evidence are documented as
runtime blockers in `browser-check.md`.
