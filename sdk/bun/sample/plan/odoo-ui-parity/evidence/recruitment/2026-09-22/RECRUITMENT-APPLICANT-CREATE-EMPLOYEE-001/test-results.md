# Test results

- `bun test test/recruitment_applicant_create_employee.integration.test.ts
  --timeout 30000` — 4 passed, 0 failed, 19 assertions.
- Covered source contract, page/API binding, durable employee creation and
  applicant link, actor/company/not-ready/duplicate/stale/name guards,
  atomicity, and file-backed restart persistence.
- The initial focused run exposed two defects before final green verification:
  derived guard fields were assigned after guards, and the fixture job title
  expectation was incorrect. Both were corrected; the final rerun is the
  result above.
