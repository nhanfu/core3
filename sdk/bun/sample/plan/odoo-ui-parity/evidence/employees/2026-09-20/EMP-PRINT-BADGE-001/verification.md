# Verification

Run from `sdk/bun/sample` on 2026-09-20:

| Check | Result |
| --- | --- |
| `bun test test/employees_print_badge.integration.test.ts` | pass; 4 tests / 30 assertions |
| `bun run audit` | pass; 675 pages / 684 routes / 1,225 datasources |
| `bunx eslint test/employees_print_badge.integration.test.ts` | pass |
| Employees-scoped `git diff --check` | pass |
| Full `bun test ./test/employees_*.integration.test.ts --timeout 20000` | 57 pass / 12 fail across 69 tests; all 12 failures are unrelated shared Surveys duplicate `print_survey_results` discovery errors |
| Authenticated Odoo desktop/mobile | pass; Settings Print Badge visible; desktop download named `Badge - Abigail Peterson.pdf` |
| Authenticated Core3 desktop/mobile | exact pre-auth blocker; shared Auth page schema rejects `action` and `refresh` keys |

The focused suite covers Odoo source mapping, page/API separation, durable
print-run creation, actor/company/barcode/stale/identity guards, migration
replay, and file-backed restart.
