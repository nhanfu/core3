# Expenses parity batch 2: receipt-gated approval and refusal reasons

Status: implemented in `agent/odoo-ui-expenses-next`.

## Bounded scope

This batch closes the visible Odoo detail/processing gap around approval
controls:

- detail and processing APIs own reads and mutations, while the matching page
  YAML remains presentation-only and joins through `page.id`;
- Submit, Approve, Post, Pay, Refuse, and Reset are explicit service actions;
- Submit, Approve, and Post reject records without a receipt;
- Refuse requires and persists a reason, records it in the activity stream, and
  exposes it on the refused detail;
- the deterministic fixture includes a submitted duplicate-receipt candidate;
- detail and queue reads declare stable empty and transport-error states.

The Odoo comparison used the disposable installed-demo reference at
`http://127.0.0.1:8069`, database `core3_reference`, with source inspection in
`/home/nhanjs/projects/odoo/addons/hr_expense`. Duplicate-review and split/post
wizard parity remain outside this batch.

## Verification

- `bun test test/expenses_next.integration.test.ts`: 4 passed, 20 assertions.
- `bun run audit`: passed.
- `git diff --check`: passed.
- Built Core3 server startup completed on the isolated in-memory topology and
  `/api/modules` exposed the Expenses routes without declaration conflicts.

No screenshots or disposable database changes are committed. Browser capture
refresh was optional for this bounded completion; prior authenticated captures
remain under `/tmp/core3-expenses-final/` and the live Odoo probe was confirmed
reachable before implementation verification.
