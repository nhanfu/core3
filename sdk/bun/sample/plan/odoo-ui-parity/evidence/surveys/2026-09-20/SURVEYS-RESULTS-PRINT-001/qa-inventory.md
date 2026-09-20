# SURVEYS-RESULTS-PRINT-001 QA inventory

## Automated verification

- Focused: `bun test ./test/surveys_results_print.integration.test.ts
  --timeout 20000` — 4 passed, 17 assertions.
- Full Surveys: `bun test ./test/surveys*.integration.test.ts
  --timeout 20000` — 54 passed, 0 failed, 427 assertions across 11 files.
- Full repository: `bun test ./test --timeout 30000` — 1,445 passed, 3
  failed, 13,047 assertions across 1,448 tests. Failures were outside
  Surveys: eCommerce Pricelists menu ordering and CRM Leads Analysis/Forecast
  fixture ordering.
- Audit: `bun run audit` — 675 pages, 684 routes, 1,225 datasources.
- Scoped lint: `bunx eslint test/surveys*.ts` — pass.
- Diff check: `git diff --check` — pass.

## Browser matrix

| Runtime | Viewport | Result |
| --- | --- | --- |
| Core3 Admin | 1440x1000 | Results rendered, Print visible, `window.print` count 1, overflow false |
| Core3 Admin | 390x844 | Filtered Completed + Passed results rendered, Print visible, count 1, overflow false |
| Odoo authenticated | 1440x1000 | Feedback Form results rendered, Print visible, count 1, overflow false |
| Odoo authenticated | 390x844 | Feedback Form results rendered, Print visible, count 1, overflow false |

Core3 filter evidence shows 1 response and 7 questions for Completed + Passed;
the persisted API report run records the same cohort and deterministic
timestamp. The feature remains conditional rather than a full module sign-off.
