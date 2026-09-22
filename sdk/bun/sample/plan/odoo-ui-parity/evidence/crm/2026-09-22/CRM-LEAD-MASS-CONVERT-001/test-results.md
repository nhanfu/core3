# Test results

Command:

```text
bun test test/crm_mass_convert.integration.test.ts
```

Result: **4 pass, 0 fail, 21 assertions**.

Coverage includes source/action/page binding, successful conversion and
assignment, row-version and activity persistence, empty/missing/closed/invalid
selection guards, inactive team rejection, transaction rollback when a later
selected row is invalid, and file-backed restart persistence.

The focused test uses a CRM-local DuckDB schema and does not require cross-
service tables. No unrelated files were changed by the feature.

Related checks: `bun test test/crm_merge_opportunities.integration.test.ts`
passed 2 tests / 14 assertions. The broader CRM integration run passed 45
tests and failed 1 existing AI allowlist invariant (227 assertions); the
failure lists the four pre-existing Lead Mining operations and this new
`crm.leads.mass_convert`. The AI catalog was not changed because it is outside
the CRM-only scope.
