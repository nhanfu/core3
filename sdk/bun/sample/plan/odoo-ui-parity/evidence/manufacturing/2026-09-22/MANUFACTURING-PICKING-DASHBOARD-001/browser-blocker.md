# BrowserSkill blocker

- Browser instance: `245ea108`
- Existing authenticated Odoo tab: `1770662590`
- Borrow result: rejected with `tab is borrowed by another session`; owning
  session was `ssyn`.
- Task-created probe: `http://localhost:8069/odoo/manufacturings?db=core3_reference`
  rendered Discuss/OdooBot instead of the Manufacturing action.
- Desktop capture: `odoo-blocker-desktop.png`, 1916x833,
  SHA-256 `425bf85b5d326d87781116c7c0b12e28346cf96a80221191714ed416e5e754ed`.
- Mobile capture: `odoo-blocker-mobile.png`, 390x844,
  SHA-256 `f3cfb7e8b256d7d0d8d41663b8a681a378cfe4985aaf56a1b2b22df9e27794c2`.
- Cleanup: BrowserSkill task session `uzyd` was stopped; the task-created tab
  was returned. No credentials, cookies, tokens, or independent login were
  accessed, and no visual-parity claim is made.
