# Verification

The bounded source, YAML contract, migration, persistence, and guard checks
passed. This slice does not claim complete Project module parity or complete
Odoo portal sharing.

BrowserSkill limitation:

- Browser instance: 245ea108.
- Authenticated Odoo tab: 1770662590.
- Exact result: tab is borrowed by another session because session olvm owned
  the tab; an alternate user-tab borrow waited 30 seconds without extension
  confirmation.
- Cleanup: only this session's psih session was stopped; no other session or
  borrowed tab was stopped or returned.
- Captures: none. No authenticated desktop/mobile or visual-parity claim is
  made.
