# point-of-sale parity progress

Module owner: point-of-sale module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: in-progress
Verification trigger: feature-complete
Candidate commit: working tree after authenticated POS QA

## Current state

The module has a current functional/browser QA candidate. No complete parity
claim is made because broader route interaction, empty/error states, and fresh
paired Odoo adjudication remain open.

## Current evidence (2026-09-12)

- POS focused corpus: `bun test ./test/pos*.integration.test.ts --timeout 20000` — 84 passed, 700 assertions, 0 failed across 24 files.
- Fresh authenticated touch-selling captures on port 4028 passed at desktop
  1440x900 and mobile 390x844. Both rendered the active session and House
  coffee product with no page errors, failed requests, HTTP failures, or
  horizontal overflow. Captures: `/tmp/core3-pos-touch-current-desktop.png`
  and `/tmp/core3-pos-touch-current-mobile.png`.
- Fresh authenticated cashier mutations passed: opening control persisted
  counted cash; adding House coffee recalculated the ticket to 7.70;
  overpayment returned 400; Cash payment persisted Paid/7.70; Fleet was
  denied `pos.write` with 403.

## Next bounded task

Complete the remaining POS route interaction and empty/error coverage, then
run fresh paired Odoo/Core3 comparisons for the accepted cashier,
configuration, and reporting surfaces before sign-off.
