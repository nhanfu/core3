# Source comparison

| Odoo behavior | Core3 mapping | Result |
| --- | --- | --- |
| `menu_product_combos` → `product.product_combo_action` | Manifest entry and `/ecommerce/combo-choices` page | implemented |
| `product.combo` name/sequence/company | `ecommerce_product_combos` durable table and form fields | implemented |
| Inline `product.combo.item` product and extra price | `ecommerce_product_combo_items`, newline `product-id|extra-price` editor | implemented |
| Computed combo price is minimum option product price | API `MIN(ecommerce_products.sales_price)` | implemented |
| At least one option, no duplicate products, no combo products | API guards and integration tests | implemented |
| Authenticated Odoo visual reference | `/shop` exact 404 on 8069 and 8073, desktop/mobile | blocked by supplied database |
