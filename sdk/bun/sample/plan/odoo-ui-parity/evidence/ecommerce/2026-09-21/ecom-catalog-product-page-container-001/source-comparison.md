# Source comparison

Reference: Odoo 19 `/home/nhanjs/projects/odoo/addons/website_sale`.

Odoo `models/website.py` defines `product_page_container` with the selection
values `unset`, `regular`, and `fluid`, defaulting to `unset`.
`views/templates.xml` calls `_get_product_page_container()` for the product
detail section and maps the regular/fluid choices to the corresponding
container classes.

Core3 maps that source setting to:

- durable table `ecommerce_product_page_container_policies`;
- deterministic `My Company` fixture with `unset`;
- `api/product-page-container-policy.yaml` and
  `pages/product-page-container-policy.yaml`, joined by the same page ID;
- Product Detail read projection and manifest configuration entry.

The policy action requires `ecommerce.write`, validates the exact three source
values, scopes the row to the active company, and requires the expected row
version. Replayed migration and mutation attempts do not duplicate or bypass
the durable state.
