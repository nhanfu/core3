# BrowserSkill check

- Required BrowserSkill instance: `245ea108`.
- Session: `ebbh`.
- User tabs were listed before borrowing. The Odoo tab was tab ID `1770662590`
  at `http://localhost:8069/odoo/contacts/9`, scope `user`.
- Borrow command attempted exactly once:
  `BSK_AUTO_START=0 bsk tab borrow 1770662590 --session ebbh --timeout 120s --json`.
- The command remained pending until the 120-second confirmation deadline; a
  session-busy response was returned while it was pending. A fresh tab listing
  confirmed tab `1770662590` remained `scope: user` and was not owned or
  modified by this worker.
- No credentials, cookies, tokens, or independent login were used. No
  Playwright session was substituted.
- Result: authenticated Odoo invoice attachment interaction and paired
  desktop/mobile captures are blocked by tab ownership. No visual-parity claim
  is made and no screenshots are claimed as captured for this stable ID.
