# Odoo source comparison

Source: `/home/nhanjs/projects/odoo`, Odoo 19 Community.

- `addons/website_sale/views/website_sale_menus.xml` registers
  `menu_delivery_zip_prefix` under the eCommerce global configuration menu,
  pointing to `delivery.action_delivery_zip_prefix_list`, group-gated with
  `base.group_no_one`.
- `addons/delivery/models/delivery_zip_prefix.py` defines
  `delivery.zip.prefix` with the required `name`/Prefix field, `_order =
  'name, id'`, uppercase normalization on create/write, and a unique-name
  constraint with message `Prefix already exists!`.
- `addons/delivery/views/delivery_zip_prefix_views.xml` defines the `Zip
  Prefix` action, route `zip-prefix`, `list,form` view modes, and help text
  explaining carrier zip restrictions.
- `addons/delivery/security/ir.model.access.csv` grants salesmen read access
  and partner managers full CRUD; the Website Sale menu itself is technical
  (`base.group_no_one`). Core3 maps that menu boundary to
  `ecommerce.technical`.

The bounded implementation intentionally does not add carrier many-to-many
assignment or delivery availability evaluation; those remain a separate
feature boundary.
