# INV-ROUTES-001 blockers

The authenticated Odoo account `codex@core3.local` reaches Inventory and the
desktop Configuration menu, but the menu omits Routes. The source menu
`menu_routes_config` is group-gated by `stock.group_adv_location`, which the
supplied account does not have. The bounded mobile probe could not reach the
Configuration control before its timeout, so no mobile Odoo screenshot is
claimed. Because the route is not reachable, no Odoo Routes list/form mutation
or direct field comparison was attempted.

Core3 evidence is complete for the bounded lifecycle. This is an exact Odoo
access blocker; it is not treated as module sign-off. No Odoo data was changed.
