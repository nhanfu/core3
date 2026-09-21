# Test results

- `bun test test/events_attendee_answers.integration.test.ts --timeout 20000`:
  **2 passed, 0 failed, 15 assertions**.
- `bun run audit`: **passed**, 772 pages, 781 routes, 1,582 datasources.
- `bunx eslint sample/test/events_attendee_answers.integration.test.ts`:
  **passed**.
- `git diff --check`: **passed**.
- The earlier full Events command reported global discovery failures while the
  CRM lead-mining files were incomplete. In the current tree direct discovery
  binds one owner for each lead-mining datasource and the CRM focused test is
  green; no CRM files were changed or staged by this Events slice.
