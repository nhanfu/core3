# Source comparison

Reference: Odoo 19 `/home/nhanjs/projects/odoo/addons/website_sale`.

Odoo `models/website.py` defines `product_page_image_spacing` with the
selection values `none`, `small`, `medium`, and `big`, defaulting to `none`.
`views/templates.xml` emits `website.product_page_image_spacing` as the
product image grid's `data-image_spacing` attribute.

Core3 maps that source setting to:

- durable table `ecommerce_product_page_image_spacing_policies`;
- deterministic `My Company` fixture with `none`;
- `api/product-page-image-spacing-policy.yaml` and
  `pages/product-page-image-spacing-policy.yaml`, joined by the same page ID;
- Product Detail read projection and manifest configuration entry.

The policy action requires `ecommerce.write`, validates the exact four source
values, scopes the row to the active company, and requires the expected row
version. Replayed migration and mutation attempts do not duplicate or bypass
the durable state.
