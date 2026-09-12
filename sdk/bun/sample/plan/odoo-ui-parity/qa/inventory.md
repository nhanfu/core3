# Inventory QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/inventory-desktop.png and inventory-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
Trigger: feature-complete
Candidate commit: `HEAD` (`SettingsView mutation transport retest`)
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
| INV-SET-08 | Authenticated Save click persists changed checkbox | PASS | Playwright POST `/api/mutate` includes `values`; Save succeeds and reload preserves the changed checkbox |
| INV-SET-09 | Odoo paired desktop/mobile visual comparison | PARTIAL | Packages paired at both viewports; Settings pair remains open |

## Current route and reference evidence (2026-09-12)

- Focused Inventory suite: `bun test ./test/inventory*.integration.test.ts --timeout 20000` — 39 passed, 0 failed, 437 assertions across 13 files.
- Fresh module-scoped authenticated route matrix: 24 routes × desktop/mobile = 48/48 passed with valid seeded detail IDs, no page errors, HTTP failures, or horizontal overflow; raw result: `/tmp/inventory-matrix-isolated.json`.
- Current paired Packages capture: Core3 and Odoo rendered at desktop/mobile under `/tmp/core3-odoo-parity/paired-inventory-20260912/`. Core3 had no failures; Odoo mobile recorded three navigation-aborted/avatar requests and no page errors, so this is comparison evidence rather than a clean zero-failure pair.

## Transfer functional evidence (2026-09-12)

- Fresh authenticated Admin workflow on port 4026 passed for receipt
  `receipt-00003`: `Draft` → `Waiting` (confirm, row version 1 → 2) →
  `Ready` (check availability, 2 → 3) → `Done` (validate, 3 → 4).
- Validation persisted move completion (`done_quantity = quantity`) and
  inserted the transfer timeline message. A stale cancel attempt returned the
  declared 409 guard after the transfer was complete.
- The fleet user (`fleet@tms.local`) was denied the same confirm mutation with
  the declared 403 `inventory.write` permission boundary.
- This proves one end-to-end state transition and permission boundary through
  the authenticated mutation transport. The transfer edit contract was then
  repaired: `Edit details` now opens the declared fields, Save posts
  `inventory.pickings.update`, and a reload preserved the changed contact.
- Remaining transfer CRUD interaction, the other operation kinds, and full
  Odoo workflow parity remain open.

The previous Odoo-session blocker is superseded for the current reference. The
Settings pair and remaining Inventory visual/interaction gates are still open.

## Dispatch notes

The shared action transport retest, transfer edit persistence, and one
authenticated transfer workflow pass.
Keep the module open until the remaining Odoo paired surfaces, full Inventory
CRUD/workflow browser checks, and migration-contract decision are complete.
