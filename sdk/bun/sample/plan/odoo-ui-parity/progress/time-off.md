# Time Off parity progress

Module owner: time-off module owner
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: `6300ab0a`

## Bounded draft deletion slice

## QA-pending candidate `047cbd03` (2026-09-13)

Allocation-balance persistence candidate is queued in existing
`agent/time-off-draft-delete-20260913`; no merge was performed. Focused evidence
is **2/19**, audit **647/662/1,112**. Build/lint/diff-check confirmation,
browser actor/restart, paired Odoo, typecheck, Temporal, and broader workflow
gates remain open.

Only unchanged Draft requests can be deleted from the list/detail contracts;
missing, non-Draft, stale, and repeated deletes return deterministic guards.
The candidate verifies explicit actor-role declarations and file-backed
close/reopen migration persistence. Focused regression, audit, frontend build,
and diff-check pass. No full-module parity claim is made.

## Open gates

Live Core3 HTTP binding failed; Playwright/js_repl and authenticated candidate
browser evidence are unavailable; paired Odoo desktop/mobile comparison,
repository typecheck, and local lint remain open or blocked. Full actor,
workflow/CRUD, and adapter coverage remain open.

## Reviewer reconciliation `047cbd03` (2026-09-13)

Integrated allocation-balance persistence as `c4250943`, preserving the active
progress ledger during conflict resolution. Post-merge Time Off verification
passed **53/550**, audit **661/670/1,158**, frontend build, and diff-check;
QA reports balance idempotency, row-version/workflow recalculation,
CRUD/permissions, authenticated desktop/mobile, reload, and file-backed reopen
evidence. Temporal is not applicable to the synchronous local workflow. Fresh
authenticated paired Odoo comparison remains open; no full sign-off.

## 2026-09-22 bounded candidate: accrual-plan employee stat

Implemented the source-backed Odoo `action_open_accrual_plan_employees` stat
action. The manager-only `/accrual-plans/detail/employees` read surface is
joined to its API by `page.id`, backed by migration `0.0.22` allocation-plan
relations and an idempotent lookup index. Focused verification passes **2
tests / 18 assertions**, including deterministic grouping, permission contract,
empty/503 states, migration replay, and file-backed restart persistence.

The live `core3_reference` database has no installed Time Off app/menu and
direct Odoo Time Off navigation resolves to Discuss. Core3 browser startup is
blocked by the unrelated dirty `services/fleet/api/vehicles.yaml` parse error;
paired visual evidence is not claimed. Time Off remains conditional and
unsigned-off.
