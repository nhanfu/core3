# order parity progress

| Field | Value |
| --- | --- |
| Module | `order` |
| Owning agent | order module owner |
| State | tester-failed |
| Current goal | Execute the Sales (`sale_management`) menu/action/view scope with real YAML service queries, mutations, permissions, workflows, and authenticated browser evidence. |
| Last commit | `a284eb78` (QA-5 ledger pending) |
| Tester | QA slot assigned by main agent |
| Last verification | 2026-09-13: Orders to Invoice bulk draft-invoice contract passes 3 tests and 12 assertions. |
| Open bug IDs | ORDER-QA-001, ORDER-QA-002 |

## Bounded-slice history

## QA-pending candidate `59af3991` (2026-09-13)

Quotation-template conversion is queued in existing `agent/order-wave-dev1`;
no merge was performed. Focused evidence is **3/15**, audit **659/669/1,137**,
and diff-check passes. Build/lint confirmation plus authenticated browser,
restricted actor, restart, and paired Odoo gates remain open.

## Reviewer reconciliation `59af3991` (2026-09-13)

Integrated quotation-template-to-order conversion as `7992f95e`. The
self-contained three-file slice passed post-merge focused verification **3/15**,
audit **661/670/1,157**, frontend build, and diff-check; QA reports full Sales
**25/213**, targeted ESLint, authenticated desktop/mobile, branch/permission,
rollback, persistence, and file-backed replay evidence. Live app-server restart
under duckdb-memory and fresh paired authenticated Odoo comparison remain open;
no full Order sign-off.

| Date | Slice | Commit | Tests/audits | Browser captures | Blocker or next action |
| --- | --- | --- | --- | --- | --- |
| 2026-09-12 | Orders to Upsell functional timeout repair | `ef85c2a7` | `bun test test/sales_orders_to_upsell.integration.test.ts` passes after increasing the migration-backed test timeout to 30s | No authenticated browser evidence: persistent `js_repl` is unavailable in this session | QA must repeat authenticated desktop/mobile route checks |
| 2026-09-12 | Existing Sales parity slices audit | existing work | Order detail, upsell, quotation templates, customer report, salesperson report, and Sales Teams tests were run; 14 passed, 2 failed during repository-wide discovery | Not run in this session | `ORDER-QA-001`: report tests hit unrelated repository-wide page schema errors; main integration owner must identify/fix outside-module source |
| 2026-09-12 | Runtime readiness | — | Order YAML page/API fragments validate independently; no warnings assessed from a live browser runtime | Not captured | `ORDER-QA-002`: authenticated Core3/Odoo comparison remains open because `js_repl` is unavailable and no ready isolated frontend endpoint was provided |
| 2026-09-13 | Orders to Invoice bulk invoice creation | pending (`agent/order-wave-dev1`) | `bun test test/sales_orders_to_invoice.integration.test.ts` — 3 tests, 18 assertions; `git diff --check` passes | Not captured | QA must exercise authenticated selection, confirmation, refresh, and accounting-side effects; draft orders remain in the queue until posting, and single-invoice accounting integration remains outside this bounded slice |
| 2026-09-13 | QA-5 verification of candidate `a284eb78` | `qa/order-a284eb78` | Bulk suite 3/3, 18 assertions; Sales corpus 21/21, 191 assertions; unauthenticated page/mutation HTTP 401; authenticated desktop bulk confirmation and `/api/mutate` HTTP 200; 0 browser errors | `/tmp/order-qa-bulk-invoice-desktop.png` | `ORDER-QA-003`: bulk action is Order-local and has no Accounting source-invoice call/link; fresh mobile bulk interaction, restricted actor, restart, and paired Odoo checks remain open |
| 2026-09-13 | ORDER-QA-003 cross-module repair | `54f4db20` | `bun test test/sales_orders_to_invoice.integration.test.ts`: 4/4 tests, 24 assertions; `bun run scripts/audit-order-ui.ts` passes (659 pages, 668 routes, 1139 datasources); targeted ESLint and `git diff --check` pass | Not captured | Authenticated mobile/restricted-actor/restart/paired-Odoo retests remain open; aggregate progress was intentionally not edited |
| 2026-09-13 | QA-6 verification of candidate `61422c4e` | pending QA ledger commit | Focused Orders to Invoice case set 4/4 pass; Accounting linkage, persisted `accounting_invoice_id`, rollback, duplicate/branch/stale/permission guards covered; audit passes 659 pages/668 routes/1139 datasources; `git diff --check HEAD^ HEAD` clean; ESLint 0 errors plus one ignored-YAML warning; Sales glob stopped after 12 passes | None for this candidate | No authenticated browser, restricted actor, restart, or paired Odoo evidence; not signed off |

## Next event: central review of `61422c4e`

The bounded QA candidate `61422c4e` is ready for review from
`agent/order-qa-003-cross-module-20260913` at
`/home/nhanjs/projects/core3-worktrees/order-qa-003-cross-module-20260913`.
Review must inspect the shared mutation-runtime extension and Order-owned
Accounting linkage before integration. The later developer HEAD `59af3991` is
dispatch-only and is not the candidate. Browser mobile/restricted-actor,
restart, and paired Odoo evidence remain open.
