# Verification

## Core3 contract

The focused integration test passed with **4 tests, 21 expectations, and 0
failures**. The migration is deterministic and replay-safe; no production SMS
provider is called by this bounded duplicate action.

## BrowserSkill / Odoo gate

BrowserSkill was connected to Chrome instance `245ea108`. The existing Odoo
user tab borrow request timed out while awaiting the configured confirmation;
the tab remained user-owned and was not accessed through another backend. A
task-created tab reached the authenticated Odoo Apps surface at
`http://localhost:8069` for `core3_reference`. The app catalog contained an
**SMS Marketing** installable entry, but the launcher had no SMS Marketing menu
and the mailing form could not be opened because `mass_mailing_sms` is not
installed in the reference database.

Diagnostic captures (installation blocker only, not visual-parity evidence):

- `/tmp/core3-odoo-parity/sms-mailing-duplicate-odoo-apps-desktop.png` — 1916x833
- `/tmp/core3-odoo-parity/sms-mailing-duplicate-odoo-apps-mobile.png` — 390x844

No credentials, cookies, tokens, or independent login were used. No
authenticated Odoo SMS desktop/mobile comparison or visual-parity claim is
made.
