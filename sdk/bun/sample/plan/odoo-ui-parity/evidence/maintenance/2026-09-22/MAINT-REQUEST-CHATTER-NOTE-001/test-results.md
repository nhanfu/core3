# Test results

Focused test: `test/maintenance_request_chatter_note.integration.test.ts`.

The test covers page/API binding, Odoo source inheritance and `<chatter/>`,
durable note creation, actor/content/missing/archived/stale guards, timeline
visibility, deterministic migration replay, and file-backed restart.

- `bun test test/maintenance_request_chatter_note.integration.test.ts --timeout 20000`
  — **4 passed, 22 assertions, 0 failed**.
- Request regression corpus
  (`bun test ./test/maintenance_request*.integration.test.ts --timeout 20000`)
  — **15 passed, 100 assertions, 0 failed** across 7 files.
- Full Maintenance glob — **46 passed, 4 failed**. The four failures are
  global discovery failures caused by the unrelated concurrent dirty change in
  `services/employees/pages/employees.yaml`
  (`components[0].views[4].title` is rejected by the current schema); no
  Chatter-note test failed.
- `bun run audit` — passed: **842 pages, 850 routes, 1755 datasources**.
- `bun run frontend:build` — passed, including global and Maintenance CSS.
- Targeted ESLint for the touched tests — passed.
- `git diff --check` — passed.

The existing Maintenance integration and request-activity tests are run as
regressions for the touched request-detail datasource.
