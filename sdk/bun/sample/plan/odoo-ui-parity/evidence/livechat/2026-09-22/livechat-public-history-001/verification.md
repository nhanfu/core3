# Browser verification and blocker

The single required BrowserSkill attempt used the connected Chrome instance
and started an Agent Window. The user tab list contained the authenticated
Odoo tab at `http://localhost:8069/odoo/contacts/9`; borrowing that tab was
attempted once for the Live Chat evidence pass.

The required borrow confirmation did not complete. The borrow command remained
pending, so no navigation, DOM observation, database selection, interaction,
or screenshot was performed. The pending BrowserSkill process was cancelled
and all BrowserSkill sessions were stopped. No independent browser, Playwright
session, credential access, cookie access, or bypass was used.

Result: browser evidence is **blocked**, and this slice makes no authenticated
desktop/mobile visual-parity claim. The functional evidence above is limited
to the focused declarative/API tests and local Odoo source comparison.
