# Odoo analysis

The supplied Odoo source registers `menu_product_combos` in
`website_sale/views/website_sale_menus.xml` and opens
`product.product_combo_action`. `product/views/product_combo_views.xml` uses
the `product.combo` model, `combo-choices` action path, and list/form modes.
The form edits the choice name, nullable company, and inline product options;
each option stores a product and extra price. `product_combo.py` computes the
minimum selected product price and rejects empty or duplicate option products.
`product_combo_item.py` rejects products whose type is `combo`.

The live reference comparison is blocked by the authenticated `/shop` 404
recorded in this feature folder for both supplied Odoo ports.
