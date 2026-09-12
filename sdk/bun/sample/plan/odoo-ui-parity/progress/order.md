# order parity progress

| Field | Value |
| --- | --- |
| Module | `order` |
| Owning agent | order module owner |
| State | tester-failed |
| Current goal | Execute the Sales (`sale_management`) menu/action/view scope with real YAML service queries, mutations, permissions, workflows, and authenticated browser evidence. |
| Last commit | pending (`agent/order-wave-dev1`) |
| Tester | QA slot assigned by main agent |
| Last verification | 2026-09-13: Orders to Invoice bulk draft-invoice contract passes 3 tests and 12 assertions. |
| Open bug IDs | ORDER-QA-001, ORDER-QA-002 |

## Bounded-slice history

| Date | Slice | Commit | Tests/audits | Browser captures | Blocker or next action |
| --- | --- | --- | --- | --- | --- |
| 2026-09-12 | Orders to Upsell functional timeout repair | `ef85c2a7` | `bun test test/sales_orders_to_upsell.integration.test.ts` passes after increasing the migration-backed test timeout to 30s | No authenticated browser evidence: persistent `js_repl` is unavailable in this session | QA must repeat authenticated desktop/mobile route checks |
| 2026-09-12 | Existing Sales parity slices audit | existing work | Order detail, upsell, quotation templates, customer report, salesperson report, and Sales Teams tests were run; 14 passed, 2 failed during repository-wide discovery | Not run in this session | `ORDER-QA-001`: report tests hit unrelated repository-wide page schema errors; main integration owner must identify/fix outside-module source |
| 2026-09-12 | Runtime readiness | — | Order YAML page/API fragments validate independently; no warnings assessed from a live browser runtime | Not captured | `ORDER-QA-002`: authenticated Core3/Odoo comparison remains open because `js_repl` is unavailable and no ready isolated frontend endpoint was provided |
| 2026-09-13 | Orders to Invoice bulk invoice creation | pending (`agent/order-wave-dev1`) | `bun test test/sales_orders_to_invoice.integration.test.ts` — 3 tests, 18 assertions; `git diff --check` passes | Not captured | QA must exercise authenticated selection, confirmation, refresh, and accounting-side effects; draft orders remain in the queue until posting, and single-invoice accounting integration remains outside this bounded slice |
