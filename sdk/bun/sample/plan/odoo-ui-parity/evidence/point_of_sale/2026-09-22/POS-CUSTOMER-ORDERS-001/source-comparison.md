# POS-CUSTOMER-ORDERS-001 source comparison

## Odoo source

Odoo 19 `addons/point_of_sale/models/res_partner.py` defines
`res.partner.action_view_pos_order()`. The inherited view in
`addons/point_of_sale/views/res_partner_view.xml` renders a `PoS Orders` stat
button, scoped to the selected partner (or its commercial entity) and hidden
when the count is zero.

## Core3 bounded slice

Core3 keeps the existing customer detail form and inline order projection, and
adds a `PoS Orders` stat action to a separate, read-only
`/point-of-sale/customer-orders` list/API pair. The list is scoped by the
selected customer and `current_company_name`, supports search and status
filtering, and reuses the existing POS order detail route for rows.

No customer CRUD, order CRUD, cross-service SQL, or duplicate order detail was
added. No migration is required because the slice is a projection over the
existing POS customer/order tables.
