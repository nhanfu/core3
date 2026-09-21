# Test results

Command:

```text
bun test test/timesheets_portal_grouping.integration.test.ts \
  test/timesheets_portal.integration.test.ts \
  test/timesheets_portal_filtering.integration.test.ts \
  test/timesheets_portal_sorting.integration.test.ts \
  test/timesheets_portal_visibility_domain.integration.test.ts --timeout 20000
```

Result: 19 tests passed, 0 failed, 153 expectations.

The focused test covers source comparison, page/API binding, all group
contracts, durable group values and totals, actor/company/empty guards,
migration replay, and file-backed restart. `bunx eslint
test/timesheets_portal_grouping.integration.test.ts` also passed.

`bun run css:build:timesheets` passed. A full wildcard Timesheets regression
was started but stopped after it exceeded the bounded verification window
without producing a failure summary; it is not reported as passed.

The module agent startup probe was attempted with port 4001 and failed before
listening because an unrelated page definition is invalid:

```text
components[0].views[5].category_field is required for graph
components[0].views[6].title_field is required for activity
components[0].views[6].activity_types must be a non-empty array for activity
```
