# Test results

- Focused command: `bun test ./test/accounting_invoice_reset_to_draft.integration.test.ts --timeout 20000`
- Result: **2 tests passed, 0 failed, 18 assertions**.
- Coverage includes page/API `page.id` binding, YAML schema contracts, source
  comparison, Posted/Cancelled reset transitions, invalid-state and stale-row
  guards, row-version increments, file-backed restart persistence, and actor
  permission denial.
- `bun run frontend:build` completed successfully.
- `git diff --check` was run for the Accounting implementation/evidence paths.
- Full audit/runtime startup is blocked by unrelated dirty page definitions; see
  `verification.md` for the exact error and scope.
