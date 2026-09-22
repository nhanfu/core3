# BrowserSkill blocker

Browser instance: `245ea108`.

1. Existing user tabs showed authenticated Odoo tab `1770662590` at
   `http://localhost:8069/odoo/contacts/9`. Borrowing it from task session
   `akol` failed with the exact BrowserSkill response:
   `tab is borrowed by another session`; details identified active session
   `rjvi`. No credentials, cookies, tokens, or independent login were used.
2. A task-created BrowserSkill tab navigated to
   `http://localhost:8069/odoo/manufacturing`, but the resulting URL rendered
   Discuss/OdooBot rather than Manufacturing. The launcher/action was not
   available to inspect.

Truthful blocker captures, taken from the task-created tab, are outside Git:

| Viewport | Capture | SHA-256 |
| --- | --- | --- |
| Desktop (1916x833 browser viewport) | `/tmp/core3-odoo-parity/manufacturing/2026-09-22/MANUFACTURING-MO-SCRAPS-001/odoo-blocker-desktop.png` | `425bf85b5d326d87781116c7c0b12e28346cf96a80221191714ed416e5e754ed` |
| Mobile (390x844) | `/tmp/core3-odoo-parity/manufacturing/2026-09-22/MANUFACTURING-MO-SCRAPS-001/odoo-blocker-mobile.png` | `f3cfb7e8b256d7d0d8d41663b8a681a378cfe4985aaf56b1a2b22df9e27794c2` |

The BrowserSkill task session was no longer registered when cleanup was
attempted; status showed only the pre-existing session. No borrowed tab was
held by this task.
