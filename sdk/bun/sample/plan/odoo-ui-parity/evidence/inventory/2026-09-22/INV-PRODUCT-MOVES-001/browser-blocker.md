# Browser blocker

BrowserSkill preflight on 2026-09-22:

- Shared browser instance: `245ea108`, Chrome 145.0.0.0, extension 0.3.0.
- `bsk doctor`: daemon, protocol, and extension connection all passed; one browser connected.
- User tabs listed included authenticated Odoo tab `1770662590`, title `Acme Corporation`, URL `http://localhost:8069/odoo/contacts/9`.
- Borrow command: `bsk tab borrow 1770662590 --session rjvi --timeout 120s` produced no completion result and the session disappeared after the confirmation wait. This is recorded as an extension borrow-confirmation timeout.
- Follow-up `bsk tab list --scope user --session rjqx` still showed the tab in the user scope and no borrowed tab.

No Odoo page was read or interacted with after the failed borrow. No desktop/mobile screenshot, authenticated action inspection, or visual-parity claim is made. The tab was not independently opened or replaced with Playwright.
