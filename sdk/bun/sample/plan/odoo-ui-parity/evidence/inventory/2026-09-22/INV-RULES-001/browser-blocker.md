# Browser evidence blocker — `INV-RULES-001`

BrowserSkill daemon status was healthy on 2026-09-22:

- Browser instance: `245ea108`, Chrome 145, extension 0.3.0, protocol 1.3.
- User tab listed: `1770662590`, title `Acme Corporation`, URL
  `http://localhost:8069/odoo/contacts/9`.
- Borrow command issued through BrowserSkill:
  `bsk tab borrow 1770662590 --session <session> --timeout 120s`.
- The borrow remained pending and expired without confirmation. The tab was
  never treated as owned or read. No independent login, Playwright session,
  cookie, token, or credential was used.
- Sessions were stopped afterward; BrowserSkill reported zero active sessions
  while instance `245ea108` remained connected.

Because the authenticated tab could not be borrowed, desktop/mobile Odoo Rules
captures could not be truthfully taken in this run. This is a browser-access
blocker, not a visual-parity pass.
