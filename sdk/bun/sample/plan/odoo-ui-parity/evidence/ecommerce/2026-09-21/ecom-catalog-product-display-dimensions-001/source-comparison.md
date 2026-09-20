# Source comparison

Odoo source inspected:

- `/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py`
  defines `website_size_x` and `website_size_y` as integer fields with default
  `1`.
- `/home/nhanjs/projects/odoo/addons/website_sale/controllers/main.py`
  clamps both values with `min(max(..., 1), ppr)` during website grid
  placement.
- The same controller writes both values from Website editor x/y options.

Core3 comparison:

- Migration `094` adds durable columns with database defaults; migration `095`
  sets deterministic Mug width `2` and Chair height `2` fixtures.
- `api/products.yaml`, `api/shop.yaml`, and `api/product-detail.yaml` expose
  the fields; their paired page YAML exposes list/detail fields and the
  permissioned edit action.
- The implementation preserves the source-backed grid inputs without claiming
  browser-rendered grid parity where the runtime is unavailable.
