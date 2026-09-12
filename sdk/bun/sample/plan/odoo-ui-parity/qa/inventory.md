# Inventory QA ledger

QA state: qa-in-progress
Trigger: feature-complete
Candidate commit: `3aec95dc` (`feat(inventory): add settings parity slice`)
Runtime: `http://127.0.0.1:3316`, isolated Inventory runner
Authenticated user: `admin@tms.local`

## Settings acceptance matrix

| ID | Check | Result | Evidence |
| --- | --- | --- | --- |
| INV-SET-01 | Manager-only menu, page/API `page.id`, SettingsView fields | PASS | `inventory_settings.integration.test.ts`; authenticated desktop/mobile render |
| INV-SET-02 | Deterministic settings defaults and idempotent migration | PASS | focused integration test, migration `0.0.17` |
| INV-SET-03 | Direct persisted update increments row version | PASS | authenticated `/api/mutate` response; repository mutation assertions |
| INV-SET-04 | Stale row version returns 409 | PASS | focused integration test |
| INV-SET-05 | Missing settings returns 404 | PASS | focused integration test |
| INV-SET-06 | Desktop render at 1440x900, no failed requests/errors/overflow | PASS | `/tmp/core3-inventory-settings-desktop.png`; Playwright state |
| INV-SET-07 | Mobile render at 390x844, no failed requests/errors/overflow | PASS | `/tmp/core3-inventory-settings-mobile.png`; Playwright state |
| INV-SET-08 | Authenticated Save click persists changed checkbox | BLOCKED | shared server-action transport drops draft `values`; response `400 No fields to update` |
| INV-SET-09 | Odoo paired desktop/mobile visual comparison | BLOCKED | Odoo session unavailable in this run |

## Dispatch notes

The developer candidate is ready for QA review of the declarative contract and
direct service mutation. Re-dispatch after the shared action transport accepts
SettingsView draft values; then rerun INV-SET-08 and capture persisted UI state
after reload. Keep this ledger module-owned and do not mark Inventory
parity-signed-off while either blocker remains.
