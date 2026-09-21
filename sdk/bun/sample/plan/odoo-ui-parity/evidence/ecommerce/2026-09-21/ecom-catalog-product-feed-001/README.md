# ECOM-CATALOG-PRODUCT-FEED-001

Wave 18 bounded Ecommerce parity evidence for Website Sale Product Feeds.
This slice covers feed configuration, token-protected public feed data, and
cached GMC XML generation. It does not represent Ecommerce module sign-off.

- Odoo source: `product.feed`, `/gmc.xml`, Product Feed list/form, menu action,
  and Product Feed security group.
- Core3: durable migrations 100/101, separate page/API YAML, public operation,
  permissioned CRUD/generation, category filtering, cache invalidation, and
  restart persistence.
- Verification: focused lifecycle test, five-file Ecommerce regression, UI
  audit, scoped ESLint, and diff check.
- Browser/Odoo status: authenticated Core3 desktop/mobile capture is blocked
  by unavailable runtime/ports; Odoo `/shop` is an exact HTTP 404 on ports
  8069/8073. No rendered UI sign-off is claimed.
- Nothing was pushed.
