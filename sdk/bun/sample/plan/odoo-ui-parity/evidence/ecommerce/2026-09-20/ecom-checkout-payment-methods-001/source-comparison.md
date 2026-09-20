# ECOM-CHECKOUT-PAYMENT-METHODS-001 source comparison

| Boundary | Supplied Odoo source | Core3 implementation | Result |
| --- | --- | --- | --- |
| Menu/action | `website_sale/views/website_sale_menus.xml`: `menu_ecommerce_payment_methods` → `payment.action_payment_method` | `services/ecommerce/manifest.yaml`: Configuration > Payment Methods → `/ecommerce/payment-methods` | Implemented |
| Model | `payment.method`, ordered by active, sequence, name; primary methods only in the action domain | `ecommerce_payment_methods`, active/sequence/name ordering and `primary_payment_method_id IS NULL` checkout/catalog filter | Implemented bounded primary-method surface |
| List/form | Name, technical code, sequence, active, supported providers and feature/availability data | Separate page/API YAML with name, code, sequence, providers, countries, currencies, capture/refund capabilities, archive/restore/delete | Implemented |
| Checkout | Odoo payment form consumes compatible active primary methods | Checkout datasource and both authenticated/guest guards read active Ecommerce-owned rows; seeded methods preserve existing flows | Implemented |
| Persistence | ORM-backed payment methods and relations | Migrations 042/043 create durable rows and deterministic Wire Transfer, Cash on Delivery, and Card fixtures; restart test passes | Implemented |
| Authenticated Odoo visual reference | `/shop` on 8069 and 8073 | Exact authenticated Odoo Error 404 at desktop/mobile | Blocked by supplied reference |

The bounded slice does not claim provider gateway execution, payment tokens,
transactions, or third-party authorization. Those remain the next external
payment boundary after the catalog/settings contract.
