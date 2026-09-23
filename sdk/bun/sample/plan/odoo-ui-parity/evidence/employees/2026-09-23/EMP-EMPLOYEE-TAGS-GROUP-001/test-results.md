# Test results

Focused: `bun test test/employees_tags_group.integration.test.ts` — 3 pass,
0 fail, 14 expect calls.

Adjacent regression: `bun test test/employees_tags.integration.test.ts` — 4
pass, 0 fail, 51 expect calls.

The focused suite verifies source mapping, projection/search/company scope,
migration replay, and file-backed restart persistence.
