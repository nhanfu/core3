# Source comparison

## Odoo 19

- `addons/website_sale/models/res_config_settings.py:16-21` defines
  `group_product_price_comparison` as the Comparison Price boolean and implies
  `website_sale.group_product_price_comparison`.
- `addons/website_sale/security/res_groups.xml:9-11` defines the Comparison
  Price feature group.
- `addons/website_sale/views/res_config_settings_views.xml:104-109` exposes
  the common-to-websites comparison setting.
- `addons/website_sale/views/product_views.xml:119-125` gates the product
  form's `compare_list_price` field on the feature group.
- `addons/website_sale/models/product_template.py:635-648` adds the converted
  comparison value to combination information only when the group is enabled;
  `views/templates.xml:2716-2723` renders the strikethrough only when the
  value is present and greater than the sale price.

## Core3

- `services/ecommerce/migrations/20260922110000-162-ecommerce-product-compare-price-visibility.yaml`
  adds durable company-scoped policy storage.
- `services/ecommerce/migrations/20260922111000-163-ecommerce-product-compare-price-visibility-demo.yaml`
  seeds the disabled My Company default idempotently.
- `services/ecommerce/api/product-compare-price-policy.yaml` and
  `services/ecommerce/pages/product-compare-price-policy.yaml` remain
  separate and join through matching `page.id`.
- `services/ecommerce/api/products.yaml`, `api/product-detail.yaml`,
  `api/product-variant-detail.yaml`, and `api/shop.yaml` preserve stored
  `compare_list_price` while gating the exposed `compare_at_price` projection
  on the effective policy.
- `services/ecommerce/manifest.yaml` adds the Configuration menu entry with
  `ecommerce.read`; the update action requires `ecommerce.write` and uses
  company and optimistic row-version guards.
- `test/ecommerce_product_compare_price_visibility.integration.test.ts`
  covers source parity, paired contracts, permissions, guards, projections,
  migration replay, and restart persistence.

## Gap result

The prior `ECOM-CATALOG-PRODUCT-COMPARE-PRICE-001` slice persisted and edited
the comparison value but exposed it unconditionally. This slice closes only
the missing visibility policy; it does not duplicate compare-at storage or
price validation.
