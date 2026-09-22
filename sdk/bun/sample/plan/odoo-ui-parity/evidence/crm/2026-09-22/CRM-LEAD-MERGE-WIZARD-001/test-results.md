# Test results

- `bun test test/crm_merge_opportunities.integration.test.ts` — 2 pass / 14 assertions.
- `bun test test/crm.integration.test.ts test/crm_merge_opportunities.integration.test.ts` — 47 pass / 1 fail / 241 assertions. The single failure is the existing CRM AI-catalog expectation for four Lead Mining Requests operations and is unrelated to this feature.
- `bun run audit` — pass; 819 pages, 828 routes, and 1,707 datasources.
- `bunx eslint sample/test/crm_merge_opportunities.integration.test.ts` — pass.
- `bun run css:build:crm` — pass.
- `bun run frontend:build` — pass.
- `bun run lint` from `sdk/bun` — baseline failure in unrelated concurrent files:
  `accounting_invoice_reset_to_draft.integration.test.ts:53`,
  `inventory_product_replenishment.integration.test.ts:32`, and
  `purchase_order_email.integration.test.ts:8` each have an unused variable.
- `git diff --check` — pass for the worktree.
