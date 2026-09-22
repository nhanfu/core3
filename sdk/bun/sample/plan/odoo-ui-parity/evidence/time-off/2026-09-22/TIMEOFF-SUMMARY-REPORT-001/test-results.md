# Test results

Focused test: `test/time_off_summary_report.integration.test.ts` — **PASS**,
4 tests / 19 assertions.

Relevant Time Off regression: `bun test ./test/time_off*.integration.test.ts`
— **PASS**, 78 tests / 737 assertions after updating the existing Summary
contract to `operation: print_report`.

The focused suite covers local Odoo source IDs, page/API separation, report
metadata and measures, validation/permission declarations, migration replay,
and file-backed restart persistence.

Frontend/CSS and final diff checks are recorded after the final verification
run.
