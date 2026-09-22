# Browser verification and blocker

BrowserSkill daemon status confirmed shared Chrome instance `245ea108` with a
connected extension. Session `roqk` listed authenticated Odoo tab
`1770662590` (`Acme Corporation`, `http://localhost:8069/odoo/contacts/9`).

Borrowing that user tab with the required command timed out after the 30-second
extension confirmation wait. The tab was never borrowed, no navigation or
inspection was attempted on an unowned tab, and session `roqk` was stopped.
No credentials, cookies, or tokens were read. No desktop/mobile screenshot was
produced for this feature, so no visual-parity claim is made.

Expected follow-up captures when tab ownership and the Odoo addon/runtime are
available:

- `/tmp/odoo-livechat-transcript-download-desktop-1440x900-20260922.png`
- `/tmp/odoo-livechat-transcript-download-mobile-390x844-20260922.png`
- `/tmp/core3-livechat-transcript-download-desktop-1440x900-20260922.png`
- `/tmp/core3-livechat-transcript-download-mobile-390x844-20260922.png`
