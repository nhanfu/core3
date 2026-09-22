# POS-SESSION-JOURNAL-ITEMS-001 browser evidence

Date: 2026-09-22
Reference: `http://localhost:8069`, database `core3_reference`
Feature: Odoo `pos.session.show_journal_items` / Journal Items smart button

## BrowserSkill trace

- BrowserSkill daemon `0.3.0`, Chrome instance `245ea108`, extension connected.
- The existing user Odoo tabs were listed before borrowing. A borrow request for
  the Odoo tab timed out waiting for confirmation; it was not retried, and no
  user tab was acquired or altered.
- BrowserSkill-owned session `dzxd` opened the Odoo POS dashboard, then Orders
  → Sessions. The authenticated reference page rendered four sessions and the
  `Furniture Shop/00001` detail form. The session was stopped successfully.
- The authenticated QA user could see the POS session form's Orders and
  Payments smart buttons, but Journal Items and Cash Register are hidden by
  Odoo's `account.group_account_readonly` permission. This matches the source
  contract and is an exact reference-user permission boundary, not a missing
  implementation claim.
- The reference screenshots are retained outside Git at:
  `/tmp/core3-reference-pos-sessions-20260922.png`
  and `/tmp/core3-reference-pos-session-detail-20260922.png`.

## Core3 verification

- The POS-only Core3 agent runtime discovered `/point-of-sale/session-journal-items`
  and returned `GET /api/modules` with HTTP 200 on port 4331.
- A BrowserSkill-owned Core3 tab reached the protected route and rendered the
  Core3 sign-in page. No local QA credential was entered or exposed, so an
  authenticated Core3 page/click-through cannot be claimed in this run.
- The full all-module dev command was also attempted with
  `bun run dev --db=ddb --memory`; startup stopped before readiness because an
  unrelated page definition contains `actions[2].action`, which the current
  schema rejects. The POS-only runtime remained healthy for discovery.

## Contract and persistence evidence

- `test/pos_session_journal_items.integration.test.ts`: 3 tests passed, 27
  assertions; source/action mapping, `page.id` join, `accounting.read`,
  session/company scope, search/filter contract, deterministic four-row seed,
  migration replay, and file-backed restart persistence.
- Odoo source inspected:
  `addons/point_of_sale/views/pos_session_view.xml` and
  `addons/point_of_sale/models/pos_session.py`.
- No credentials, cookies, tokens, or permission bypass were used. No Odoo
  records were created, edited, or deleted.

Remaining gap: authenticated Core3 desktop/mobile visual proof and positive
Journal Items click-through require a reusable authenticated Core3 QA tab and
an Odoo user with the accounting read group. The service-level implementation
and persistence contract are complete.
