# Test results

Focused contract test:

- bun test ./test/sms_marketing_utm_campaigns.integration.test.ts --timeout 20000 — 4 passed, 32 assertions.

The test covers source/menu mapping, page/API separation, migration replay,
deterministic rows, search/stage/archive/empty reads, CRUD, validation,
duplicate protection, stale row-version rejection, archive/restore, permission
boundaries, and fixed seed dates.

Regression and hygiene checks:

- bun test ./test/sms_marketing*.integration.test.ts --timeout 20000 — 33 passed, 315 assertions, 0 failures.
- bunx eslint sample/test/sms_marketing_utm_campaigns.integration.test.ts — passed with no warnings.
- bun scripts/audit-order-ui.ts — passed: 834 pages, 842 routes, 1,739 datasources.
- bun run css:build:sms-marketing — passed.
- bun run frontend:build — passed (all CSS bundles and Vite production build).
- git diff --check — passed with no whitespace errors.
