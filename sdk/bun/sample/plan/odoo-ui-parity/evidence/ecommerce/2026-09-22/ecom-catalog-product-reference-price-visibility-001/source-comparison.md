# Source comparison

## Odoo 19

- `addons/website_sale/models/res_config_settings.py:10-15` defines
  `group_show_uom_price` as the “Base Unit Price” boolean, disabled by default,
  and implies `website_sale.group_show_uom_price`.
- `addons/website_sale/security/res_groups.xml:5-7` defines the
  `UOM Price Display for eCommerce` feature group.
- `addons/website_sale/views/res_config_settings_views.xml:110-118` exposes
  the “Product Reference Price” setting and its help text.
- `addons/website_sale/views/product_views.xml:126-132,145-151,236-242`
  gates the product and variant base-unit fields on the feature group.
- `addons/website_sale/models/product_template.py:677-685` only adds the
  `base_unit_price` combination value when the feature group is enabled.
- `addons/website_sale/views/templates.xml:2083-2091,2393-2401,3066-3078`
  gates product-page and cart reference-price rendering on the same feature.

## Core3

- `services/ecommerce/migrations/20260922100000-160-ecommerce-product-reference-price-visibility.yaml`
  adds durable company-scoped policy storage.
- `services/ecommerce/migrations/20260922101000-161-ecommerce-product-reference-price-visibility-demo.yaml`
  seeds the disabled My Company default idempotently.
- `services/ecommerce/api/product-reference-price-policy.yaml` and
  `services/ecommerce/pages/product-reference-price-policy.yaml` remain
  separate and join through the matching `page.id`.
- `services/ecommerce/api/product-variant-detail.yaml` and
  `services/ecommerce/api/product-detail.yaml` preserve base-unit source data
  while nulling the exposed reference-price projection when disabled.
- `services/ecommerce/pages/product-variant-detail.yaml` hides the base-unit
  configuration action and fields while the policy is disabled.
- `test/ecommerce_product_reference_price_visibility.integration.test.ts`
  covers source parity, permissions, guards, migration replay, projection
  behavior, and restart persistence.

## Live blocker

The authenticated Odoo reference is reachable, but `/shop` returned HTTP 404
at desktop and iPhone-14 mobile viewports. The Website Sale/eCommerce module
screen is absent from `core3_reference`; the paired visual comparison cannot
be completed and the module remains unsigned off.
