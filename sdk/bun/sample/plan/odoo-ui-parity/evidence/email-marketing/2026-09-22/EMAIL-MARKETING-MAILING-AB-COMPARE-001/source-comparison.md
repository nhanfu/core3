# Source comparison

| Odoo behavior | Existing Core3 state | Bounded change |
| --- | --- | --- |
| `action_compare_versions` returns `A/B Tests` in five view modes scoped to the current campaign's A/B-enabled mailings | Core3 had A/B fields and winner selection but no comparison page/action | Add `/email-mailings/ab-tests` with list, kanban, form, calendar, and graph tabs over durable `email_mailings` rows. |
| Compare Version is visible only with at least two variants | The existing detail action had no durable variant-count guard | Add `ab_testing_variant_count` to the detail datasource and require `>= 2` in `show_if`. |
| Comparison is read-only and supports empty/no-result states | No page/API contract existed | Add a read-only API datasource with permission, transport, unauthorized/forbidden, search, status, and empty contracts. |
| Row opens the mailing form | No comparison-row navigation existed | Add page-bound navigation back to `/email-mailings/detail`. |
| Installed Odoo visual reference | Live tab could not be borrowed; Email Marketing installation state was not inspected | Record the exact BrowserSkill blocker and make no visual claim. |
