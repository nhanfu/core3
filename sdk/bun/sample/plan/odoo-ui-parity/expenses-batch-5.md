# Expenses batch 5: Post Expenses wizard

Status: implemented; authenticated visual capture blocked by the local Core3 startup environment.

## Source-backed scope

The next uncovered Odoo `hr_expense` action after duplicate review and split is the posting wizard in `/home/nhanjs/projects/odoo/addons/hr_expense/wizard/hr_expense_post_wizard_views.xml`. Its form is titled `Post Expenses`, presents `Journal` and `Accounting date`, and has `Post Expenses` and `Cancel` footer buttons. The model implementation in `hr_expense_post_wizard.py` applies the selected purchase journal and accounting date before posting entries, and requires accounting-entry create access. This batch keeps that action on the expense detail page and preserves the existing `expenses.manage` boundary.

## Bounded implementation

- Changed `post_expense_detail` to a `server_form` titled `Post Expenses` with Odoo labels, cancel behavior, journal choices, and an ISO accounting-date field.
- Added the service-owned `expense_post_wizard` datasource, joined through the existing `expense-detail` page ID, with deterministic `Employee Expenses` and `2026-09-12` defaults.
- Added idempotent migration `20260912110000-010-expenses-post-wizard.yaml` for posting journal and accounting-date metadata, and records those values plus a stable activity message when posting succeeds.
- Guards cover missing records, stale/non-Approved records, missing receipts, invalid journal/date values, and the manager permission metadata. Cancel is a client-only modal action and does not mutate data.

## Verification

- `bun test test/expenses_next.integration.test.ts`: 7 passed, 0 failed, 35 assertions. This includes page/API separation, wizard prefill, successful posting, invalid values, stale state, receipt guards, and workflow coverage.
- `bun run audit`: passed (`582 pages`, `589 routes`, `1002 datasources` in this worktree).
- `bunx eslint sample/test/expenses_next.integration.test.ts`: passed.
- `git diff --check`: passed.

## Browser and comparison evidence

The required fallback Playwright check was attempted with system Chrome and the authenticated demo credentials. No Core3 capture is claimed: the server did not reach a listening state because DuckDB startup migration failed with `Adding columns with constraints not yet supported`; the dev frontend also hit the host `EMFILE` file-watcher limit. Therefore there are no valid authenticated desktop `1440x900` or mobile `390x844` captures for this batch, and no visual-parity claim is made. The intended artifact directory remains `/tmp/core3-odoo-parity/expenses-batch-20260912/`; screenshots are not added to Git.
