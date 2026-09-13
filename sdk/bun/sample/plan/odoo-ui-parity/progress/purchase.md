# Purchase parity progress

Module owner: purchase module owner
QA assignment: purchase-qa
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: `fa6e2b65cd8e4191a5aebd2577ac3394187f4759`

## Current state

Bounded QA completed for the receipt cancellation persistence slice. The
focused receipt suite passed 4 tests and 35 assertions. It verified the seeded
Draft receipt, Cancelled state/version persistence, actor/action/detail audit
message, and repeat cancellation guard. UI audit, Purchase CSS build,
candidate test-file ESLint, and `git diff --check` passed.

Authenticated candidate browser evidence could not be completed: the candidate
frontend reached `:3002`, but its backend `:3001` was unreachable. Full
regression was interrupted while still running. Cancellation stale-version,
authenticated actor permission, and fresh desktop/mobile/Odoo receipt gates
remain open. No full Purchase sign-off is made.

## QA ledger

See [`qa/purchase.md`](../qa/purchase.md) for exact commands, captures,
process cleanup, findings, and evidence boundaries.

## Next bounded task

Re-run the authenticated receipt cancellation flow after a healthy candidate
backend is available, including desktop/mobile captures, paired Odoo evidence,
direct stale-version and actor-permission probes, then complete the full
regression without changing this evidence boundary.

## QA disposition `c14ca127` (2026-09-13)

Do not integrate the Purchase receipt candidate. QA found
`PURCHASE-RECEIPT-001`: admin context is `Core3 Demo Company`, but receipt
`WH/IN/00005` is `My Company (San Francisco)`, so live Cancel returns the
company-scope error before persistence. Route fixture/company-context alignment
to the existing owner `agent/odoo-ui-purchase-receipt-lifecycle-20260913` in
`/home/nhanjs/projects/core3-worktrees/purchase-receipt-lifecycle-20260913`,
then rerun authenticated mutation/reload QA. Restart and paired Odoo remain
open; no replacement or merge was made.

## Reviewer hold: `120cc740` (2026-09-13)

Owner QA passed the receipt company-context repair, but active verification
found missing Purchase prerequisite contracts in Analysis, receipt activity
actor handling, and receipt read error states. The provisional integration was
reverted as `4265e3ac`; require a same-owner active-branch rebase before
retest. Odoo comparison and unrelated Website lint remain open.
