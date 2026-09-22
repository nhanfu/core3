# BrowserSkill check

Target: `http://localhost:8069`, database `core3_reference`.

- `bsk status --json`: daemon `0.3.0`, protocol `1.3`, Chrome instance `245ea108` connected.
- `bsk session start --json`: created session `hvbx`.
- `bsk tab list --scope user --session hvbx`: listed Odoo tabs `1770663883` and `1770663889` at the local Odoo host.
- `bsk tab borrow 1770663883 --session hvbx --timeout 20s`: timed out waiting for human confirmation.
- A follow-up tab listing showed the tab remained unborrowed; `bsk session stop hvbx` completed and returned any owned state.

No credentials, cookies, tokens, or passwords were read or printed. No tab was
borrowed, no Odoo action was clicked, and no desktop/mobile screenshots were
captured. The authenticated reference comparison is therefore blocked and the
module is not visually signed off.
