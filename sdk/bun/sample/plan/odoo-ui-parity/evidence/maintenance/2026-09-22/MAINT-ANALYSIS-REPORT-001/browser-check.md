# Browser check

BrowserSkill instance `245ea108` was used with an authenticated Odoo session
for `core3_reference` at `http://localhost:8069`.

| Check | Result | Evidence |
| --- | --- | --- |
| Odoo desktop Analysis route | pass | Graph and Pivot controls observed; reference PNGs in this folder |
| Odoo Pivot measures | pass | Duration, Repeat Every, and Count observed in the Measures menu |
| Odoo mobile Analysis route | pass | 390x844 emulation loaded the Kanban fallback; reference PNG in this folder |
| Core3 single-module runtime | pass | `http://127.0.0.1:4325/api/modules` listed Maintenance and `maintenance-analysis` |
| Core3 authenticated desktop/mobile route | blocked | Task-created tab rendered Core3 login; borrow of the existing authenticated user tab remained pending |

The Core3 browser blocker was recorded without printing or handling passwords,
cookies, or tokens. No Core3 screenshot or visual-parity claim is made.
