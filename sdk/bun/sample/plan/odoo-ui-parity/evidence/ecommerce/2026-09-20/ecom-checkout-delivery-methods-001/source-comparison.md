# ECOM-CHECKOUT-DELIVERY-METHODS-001 source comparison

| Boundary | Supplied Odoo source | Core3 implementation | Result |
| --- | --- | --- | --- |
| Menu/action | `website_sale/views/website_sale_menus.xml`: `menu_ecommerce_delivery` → `delivery.action_delivery_carrier_form` | `services/ecommerce/manifest.yaml`: Configuration > Delivery Methods → `/ecommerce/delivery-methods` | Implemented |
| Model | `delivery.carrier`, ordered by sequence/id; active carrier, delivery type, company, Cash on Delivery, and pricing fields | `ecommerce_delivery_methods`, ordered by sequence/name; active carrier, `fixed`/`base_on_rule`, nullable company, Cash on Delivery, prices, tracking, and description | Implemented bounded carrier surface |
| List/form | Carrier name, provider type, company, destination/availability and pricing/configuration fields | Separate page/API YAML with company filter, active/type filters, CRUD, pricing, tracking, description, archive/restore/delete | Implemented |
| Checkout | Available carriers are selected for the order/company and Cash on Delivery requires carrier support | Checkout datasource and both authenticated/guest guards read active global/current-company carriers; Cash on Delivery compatibility is validated | Implemented |
| Persistence | ORM-backed delivery carriers and product-linked prices | Migrations 044/045 create durable rows and deterministic Standard, Express, and Local Pickup fixtures; restart test passes | Implemented bounded catalog |
| Authenticated Odoo visual reference | `/shop` on 8069 and 8073 | Exact authenticated Odoo Error 404 at desktop/mobile | Blocked by supplied reference |

The bounded slice does not claim external carrier-rate/shipment execution,
country/state/zip rules, or delivery price-rule tables. Those remain the next
external delivery boundary after this catalog/checkout contract.
