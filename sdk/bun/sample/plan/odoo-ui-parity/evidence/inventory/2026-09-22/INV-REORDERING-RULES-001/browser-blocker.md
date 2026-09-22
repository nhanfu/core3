# BrowserSkill blocker

Required browser: shared Chrome instance 245ea108; authenticated Odoo
service/session must be reused through BrowserSkill.

Observed with the owned BrowserSkill session vctn:

1. bsk status --json reported browser instance 245ea108 connected,
   extension/protocol compatible, with borrow confirmation set to always.
2. bsk tab list --scope user --session vctn listed the signed-in Odoo tab
   1770662590 (Acme Corporation,
   http://localhost:8069/odoo/contacts/9).
3. bsk tab borrow 1770662590 --session vctn returned:

   error: tab is borrowed by another session

   hint: return the tab from the borrowing session via bsk tab return <tab-id> --session <id> or stop that session

   details: tab_borrow: tab 1770662590 is already borrowed or being borrowed by session olvm

The other session was not stopped or interfered with. No independent browser,
login, credential extraction, or tab bypass was used. Because ownership was
not granted, no truthful Odoo desktop/mobile screenshot or live action
capture could be produced; those artifacts are explicitly omitted and no
visual-parity claim is made. The owned BrowserSkill session had no borrowed tab
to return and was stopped after the attempt.

After the prior sessions disappeared, one bounded retry used a fresh session
fvyj. The same tab borrow remained pending through the configured confirmation
wait; no borrow result or tab ownership was granted. The session was then
stopped, leaving zero active BrowserSkill sessions. This retry also produced
no desktop/mobile capture and does not change the visual-evidence boundary.
