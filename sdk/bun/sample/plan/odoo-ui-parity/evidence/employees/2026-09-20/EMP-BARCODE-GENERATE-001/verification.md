# Verification

Run from `sdk/bun/sample` on 2026-09-20:

| Check | Result |
| --- | --- |
| `bun test test/employees_barcode_generate.integration.test.ts` | pass; 4 tests / 23 assertions |
| `bun test ./test/employees_*.integration.test.ts --timeout 20000` | pass; 65 tests / 658 assertions across 21 files |
| `bun run audit` | pass; 673 pages / 682 routes / 1,219 datasources |
| `bunx eslint test/employees_barcode_generate.integration.test.ts` | pass |
| `git diff --check` | pass |
| Authenticated Core3 desktop/mobile browser capture | exact blocker; session `Core3 Demo Company` vs fixture `Core3 Vietnam` |
| Authenticated Odoo desktop/mobile browser capture | pass; Settings `Badge ID?` and `Generate` observed, no page errors or failed requests |

The first focused implementation run failed because the generated value was
computed in `before_steps`, which executes after mutation guards. The API was
repaired by assigning the generated value in the actor/company-scoped guard;
the focused and full suites above are post-repair results.
