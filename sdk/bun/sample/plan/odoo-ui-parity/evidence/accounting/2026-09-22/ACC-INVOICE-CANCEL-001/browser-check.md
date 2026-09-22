# BrowserSkill check

- BrowserSkill daemon: connected, instance `245ea108`, Chrome 145.0.0.0,
  extension 0.3.0, protocol 1.3.
- Session: `olvm`.
- Existing user tab listed: `1770662590`, title `Acme Corporation`, URL
  `http://localhost:8069/odoo/contacts/9`.
- Borrow command: `BSK_AUTO_START=0 bsk tab borrow 1770662590 --session olvm --timeout 5s`.
- Exact result: `error: timed out waiting for human confirmation` / `Timed out waiting for tab borrow confirmation`.
- Result: no tab ownership, navigation, DOM interaction, or screenshot was
  performed. No independent login or alternate browser was used.
- Visual status: blocked; no desktop/mobile Odoo capture and no visual parity
  claim for `ACC-INVOICE-CANCEL-001`.
