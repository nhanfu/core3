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

## Integrated conditional bundle: `8e67c355` -> `7c34b28c` (2026-09-13)

Receipt lifecycle and Purchase Analysis prerequisites are integrated. Active
bounded verification passed receipt 7/56 and analysis 3/24; audit, Purchase
CSS, and diff-check passed. Owner QA reports 61/576 with live cancel/reload,
restart, guards, timeline, and desktop/mobile evidence. Authenticated Odoo
comparison and unrelated Website lint remain open.

## 2026-09-21 bounded slice: Purchase Order Print

The current Purchase owner added Odoo's state-specific Purchase Order form
Print action as a page/API-bound pair. Quotation printing persists a PDF report
run and moves Draft to Sent; confirmed printing persists the Purchase Order
report run without changing state. Focused validation passed 4 tests / 27
assertions, including restart and migration replay. Authenticated desktop/mobile
Core3 evidence passed the button interaction and HTTP mutation/refresh checks.

The slice is conditional: Odoo's download completion is not DOM-observable,
Core3 prepares report metadata rather than binary PDF bytes, and the active
working tree has unrelated Email/SMS discovery failures. See the QA ledger and
the Purchase-only evidence manifest for exact blockers and paths.

## 2026-09-22 bounded slice: Purchase Order Catalog

Implemented `PURCHASE-CATALOG-001` from Odoo's Products-tab
`action_add_from_catalog`. Core3 adds a page/API-bound multi-product Catalog
form, durable order-line product identity, add-or-merge behavior, total/version
recalculation, and editable-state/selection guards. Focused Catalog + line
regression passed 5/49; full Purchase passed 86/743; audit, frontend/CSS, and
diff-check passed.

Status remains **conditional**: BrowserSkill instance `245ea108` could not
borrow the authenticated Odoo tab (first occupied by another session, then
borrow confirmation pending until timeout). No desktop/mobile capture or
visual-parity claim is made. Vendor-specific seller pricing and Odoo's richer
per-card catalog quantity UI remain follow-up gaps.

## 2026-09-22 bounded slice: Purchase Order Add a section

Implemented `PURCHASE-ORDER-SECTION-001` from Odoo's Products-tab
`add_section_control`. Core3 adds a page/API-bound section-line form, durable
`line_section` identity, atomic parent version/total handling, section edit and
delete guards, and a generic LineItemGrid fix so each create control dispatches
its own action. Focused section + line regression passed 7/53; UI audit passed.

Status remains **conditional**: BrowserSkill instance `245ea108` could not
borrow signed-in Odoo tab `1770662590` before the confirmation request timed
out. No desktop/mobile capture or visual-parity claim is made. `Add a note`
remains a separate Purchase follow-up.

## 2026-09-22 bounded slice: Purchase Order Add a note

Implemented `PURCHASE-ORDER-NOTE-001` from Odoo's Products-tab
`add_note_control`. Core3 adds a page/API-bound note-line form, durable
`line_note` identity, atomic parent version/total handling, note edit/delete
guards, and a deterministic migration seed. Focused note validation passed
4/21 with restart and migration replay; full Purchase regression passed
94/785, with audit, Purchase Sass, frontend build, and diff-check green.

Status remains **conditional**: BrowserSkill instance `245ea108` could not
complete the required borrow of signed-in Odoo tab `1770662590`; the tab
remained user-scoped and the owned session was stopped. No desktop/mobile
capture or visual-parity claim is made.
Evidence is under
`evidence/purchase/2026-09-22/PURCHASE-ORDER-NOTE-001/`.
