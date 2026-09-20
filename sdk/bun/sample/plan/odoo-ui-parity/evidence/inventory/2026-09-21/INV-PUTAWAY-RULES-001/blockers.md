# INV-PUTAWAY-RULES-001 blockers

The bounded Odoo browser probe used `codex@core3.local` at desktop 1440x900
and mobile 390x844. Both sessions remained at `http://127.0.0.1:8069/web/login`
after the login attempt, so the captures are login-boundary screenshots only.
No authenticated Odoo menu, Putaway Rules record, or mutation is claimed.

The source menu/action and group gate are exact and documented in
`source-comparison.md`: `menu_putaway` / `action_putaway_tree` requires
`stock.group_stock_multi_locations`. No Odoo data was changed.
