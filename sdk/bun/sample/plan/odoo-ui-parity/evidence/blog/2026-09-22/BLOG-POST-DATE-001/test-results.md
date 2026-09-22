# Test results

- `bun test ./test/blog_post_date.integration.test.ts --timeout 20000`
  - 4 tests passed, 27 assertions, 0 failures, including strict ISO-compatible
    date-shape/impossible-date rejection and Odoo model inverse assertions.
- `bun test ./test/blog*.integration.test.ts --timeout 20000`
  - 50 tests passed, 290 assertions, 0 failures across 14 Blog files.
- `bun run audit`
  - 843 pages, 851 routes, and 1,761 datasources; audit passed.
- `bun run css:build:blog` passed.
- `bunx eslint test/blog_post_date.integration.test.ts` passed.
- `bun run frontend:build` passed (Vite production build, 184 modules).
- `git diff --check` passed before the final verification run.
- Browser comparison remains blocked by the exact tab-ownership timeout in
  `browser-check.md`; no visual-parity result is reported.
