# Browser verification

BrowserSkill was attempted once after the focused tests against the connected
Chrome instance. The authenticated Odoo tab at `http://localhost:8069` was
listed, but borrowing it timed out waiting for the required human confirmation
(`bsk tab borrow 1770662590 --timeout 1s`). The BrowserSkill session was stopped
immediately afterward.

The tab was not controlled, the `core3_reference` database route was not
navigated, and no credentials, cookies, tokens, or screenshots were collected.
No authenticated desktop/mobile visual-parity claim is made.
