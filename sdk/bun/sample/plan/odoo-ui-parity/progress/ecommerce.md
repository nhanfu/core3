# ecommerce parity progress

Module owner: ecommerce module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: pending DEV-4 isolated candidate

## Current state

The current wave has a committed Ecommerce implementation and authenticated
Core3 browser evidence. DEV-4 adds an eCommerce-owned, retry-safe outbox
contract for handing checkout orders to the separate Sales service. Functional
and ownership gates are still incomplete; no full parity claim is made here.

## DEV-4 evidence (2026-09-13)

- Isolated branch/worktree: `agent/odoo-ecommerce-dev4-sales-handoff`.
- Checkout creates exactly one `ecommerce_sales_handoffs` row per order,
  including authenticated and anonymous checkout paths.
- Sales-facing operations expose the handoff envelope and copied order lines.
- Claim/acknowledge mutations enforce attempt limits and optimistic row-version
  concurrency, including stale duplicate rejection.
- Focused suite: `bun test ./test/ecommerce_checkout.integration.test.ts` —
  11 passed, 59 assertions, 0 failures.
- Remaining gate: a Sales-side consumer must use this contract to create/link
  the corresponding Sales order in its own database.

## Next bounded task

Record the complete Odoo menu/action/view inventory, implement the module
functionality, and dispatch QA on the first committed candidate. Update this
file only with evidence from the matching module owner.
