# Odoo analysis — `PURCHASE-CATALOG-001`

Odoo 19 renders `Catalog` inside the Products one2many control at
`addons/purchase/views/purchase_views.xml:240-255`. The button calls
`action_add_from_catalog` with the parent order ID. The Purchase override at
`addons/purchase/models/purchase_order.py:1149-1155` selects the Purchase-only
catalog kanban/search views and passes vendor context. The source restricts
the catalog to `purchase_ok` products at lines 1167-1168. The line model
delegates its object action to the parent order at
`addons/purchase/models/purchase_order_line.py:531-533`.

The bounded Core3 contract preserves the important workflow behavior: the
Products tab exposes a Catalog action only for editable RFQs, product choices
are purchaseable and active, selection is multi-valued, and adding a selected
product increases an existing line rather than creating a duplicate.

Live action inspection was attempted through BrowserSkill instance `245ea108`.
The authenticated tab was occupied by another session and the subsequent
borrow confirmation remained pending until timeout. Therefore this document
contains source analysis only and does not claim current live Odoo appearance.
