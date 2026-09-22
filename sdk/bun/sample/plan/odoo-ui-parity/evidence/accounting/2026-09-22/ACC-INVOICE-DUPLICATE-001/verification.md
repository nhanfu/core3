# Verification

BrowserSkill used the connected Chrome instance and a task-owned borrowed tab
against the active Odoo service at `http://localhost:8069` with the
`core3_reference` authenticated session. The invoice form loaded at desktop
viewport `1916x833`; the Actions menu was opened and its `Duplicate` item was
observed. No credential, cookie, token, or password was read or printed.

The current UI audit passes, but this bounded source/API task did not run a
paired authenticated Core3 desktop/mobile comparison. The audit is not visual
evidence, so no paired desktop/mobile Core3/Odoo captures or visual-parity
claim are made.

The BrowserSkill session was stopped after inspection and the borrowed tab was
returned to the user's window.
