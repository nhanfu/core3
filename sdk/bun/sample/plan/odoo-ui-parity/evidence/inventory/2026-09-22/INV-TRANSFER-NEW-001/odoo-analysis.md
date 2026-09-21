# Odoo analysis

Local source: `/home/nhanjs/projects/odoo`, Odoo 19 stock module.

`addons/stock/views/stock_picking_views.xml:688-700` defines
`stock.action_picking_form` as the form-only `stock.picking` New Transfer
action. Its context defaults `picking_type_id` from `active_id` and sets
`contact_display` to `partner_address`.

The source form at `:111-133` has draft header actions and a state statusbar.
Fields at `:215-260` cover Contact/Delivery Address/Receive From, operation
type, source/destination locations, scheduled date, origin, and owner. The
Operations notebook at `:263-273` contains the `Add a Product` control.

Live reference check used the authenticated Inventory Overview in database
`core3_reference` at `http://localhost:8069`. Desktop accessibility snapshot
was 1916x833; the emulated mobile snapshot was 390x844. The overview rendered
Receipts, Delivery Orders, and PoS Orders. The New menu item did not navigate;
the generated action route and `/odoo/action-426` showed Odoo's generic
“Oops! Something went wrong...” modal. Therefore no live New Transfer form,
Save, or mutation behavior could be compared.
