# Browser verification

Status: **blocked** for authenticated Odoo comparison.

BrowserSkill daemon and Chrome extension were connected. The existing user tab
`1770662590` was listed at `http://localhost:8069/odoo/contacts/9`. The explicit
borrow request timed out while awaiting the configured user-window confirmation;
the tab remained user-owned. A retry could not proceed while the first borrow
command was pending, and the BrowserSkill session then stopped. No credentials,
cookies, tokens, alternate browser backend, or independent login were used.

The target database was `core3_reference`. No authenticated Odoo desktop/mobile
screenshots were captured, and this stable ID makes no visual-parity claim.
