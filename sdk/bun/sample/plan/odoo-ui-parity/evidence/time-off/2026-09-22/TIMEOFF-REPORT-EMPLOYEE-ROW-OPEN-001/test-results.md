# Test results

Focused test: `test/time_off_report_employee_drilldown.integration.test.ts` —
**PASS**, 2 tests / 12 assertions.

Relevant Time Off regression: `bun test ./test/time_off*.integration.test.ts` —
**PASS**, 74 tests / 718 assertions.

Build checks: `bun run css:build:time-off` — **PASS**; `bun run
frontend:build` — **PASS**; `git diff --check` — **PASS**.

The test covers the Odoo `form` mode, page/API `page.id` join, row key, stable
request ID, destination route, and `time_off.read` enforcement.
