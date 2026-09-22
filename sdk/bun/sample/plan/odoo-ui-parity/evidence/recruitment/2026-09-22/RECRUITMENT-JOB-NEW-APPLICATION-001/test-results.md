# Test results

- `bun test test/recruitment_job_new_application.integration.test.ts --timeout 20000`
  — 4 passed, 0 failed, 25 assertions.
- `bun test test/recruitment*.integration.test.ts --timeout 20000` — 68
  passed, 0 failed, 584 assertions across 18 files.

Assertions cover Odoo action/source XML and stable page/API discovery, the
company-scoped opening detail and form, durable creation and counter refresh,
fixed stage/date and deterministic ID, file-backed restart, and actor,
missing/closed/wrong-company/stale/name/email/detail guards with no partial
writes.
