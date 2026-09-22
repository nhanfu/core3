# BrowserSkill boundary

BrowserSkill daemon instance `245ea108` was healthy and session `hute` was
started with the user-owned browser's borrow confirmation set to `always`.
The user tab list contained no ordinary Odoo page; the only Odoo-origin tab
was a user-owned PDF tab. One explicit borrow request was issued for that tab
and timed out waiting for human confirmation. No navigation, login, token,
credential, Playwright session, or alternate browser backend was used.

The session was stopped successfully with `bsk session stop hute`, and no tab
was borrowed or modified. Because the borrow did not complete, no authenticated
Core3/Odoo visual-parity claim is made for this slice.
