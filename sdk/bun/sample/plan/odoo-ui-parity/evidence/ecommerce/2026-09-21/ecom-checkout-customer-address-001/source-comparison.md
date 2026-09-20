# Source comparison

## Odoo Website Sale

- `addons/website_sale/controllers/main.py` exposes `/shop/address` for the
  address form, `shop_address_submit` for create/update, and
  `shop_update_address` for changing the order's billing or delivery partner.
- `addons/website_sale/models/res_partner.py` extends the frontend-writable
  address field whitelist and recomputes open website-order fiscal position
  data after address changes.
- `addons/website_sale/views/templates.xml` renders the Address Management form
  and the `address_on_checkout` delivery/billing card.

## Core3 mapping

- Migrations `070` and `071` persist customer/company-scoped address records
  with billing/delivery type, normalized fields, active state, default marker,
  and optimistic row versions.
- `api/checkout.yaml` and `pages/checkout.yaml` remain separate contracts
  joined by `page.id: ecommerce-checkout`. The API lists only addresses joined
  to the open cart's customer/company, exposes guarded create/update/archive,
  and uses an optional selected address to render the persisted order address.
- Guest checkout remains unchanged and accepts only its existing free-text
  address fields; it cannot read or mutate saved customer addresses.

Core3 does not claim Odoo's full `res.partner` graph, country/state reference
models, fiscal-position recomputation, or billing partner linkage in this
bounded slice.
