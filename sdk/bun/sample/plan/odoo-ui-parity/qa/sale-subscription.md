# sale-subscription QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/sale-subscription-desktop.png and sale-subscription-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: in progress
QA slot: current five-worker wave, module-owner execution
Module owner: sale-subscription module owner
Verification trigger: contract-normalization candidate
Candidate commit: pending

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| SALE_SUBSCRIPTION-CONTRACT-001 | Every page joins a separate API/action contract by `page.id` and retains page-only layout | Focused discovery output and diff | pending |
| SALE_SUBSCRIPTION-DATA-001 | Deterministic subscriptions, invoices, and plans survive idempotent migration | Repository migration/query assertions | pending |
| SALE_SUBSCRIPTION-CRUD-001 | Create and edit quotation/paused subscriptions; reject invalid dates/revenue and edits in progress | Mutation responses plus persisted rows | pending |
| SALE_SUBSCRIPTION-WORKFLOW-001 | Confirm, pause, close, churn; reject forbidden transitions and create only one activation invoice | Workflow mutation responses plus invoice rows | pending |
| SALE_SUBSCRIPTION-BILLING-001 | Generate and post recurring invoices; advance the next invoice date and reject non-draft/non-active operations | Mutation responses plus persisted invoice/subscription rows | pending |
| SALE_SUBSCRIPTION-PERM-001 | Enforce read/write/manage boundaries, including direct plan mutations | Authenticated action responses | pending |
| SALE_SUBSCRIPTION-RESPONSIVE-001 | Core3 authenticated subscription routes render at 1440x900 and 390x844 without blank/redirect/error/overflow | `/tmp/core3-odoo-parity` captures and browser logs | pending |
| SALE_SUBSCRIPTION-ODOO-REF-001 | Compare menu/action/view/layout states against the live Odoo reference | Reference inventory proves addon unavailable | blocked |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| — | No current-wave implementation candidate has been tested | — | — | pending |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile Core3 route evidence: pending
- Odoo menu/action/view and paired visual parity: blocked by unavailable `sale_subscription` addon
- Tester decision: not signed off
