# Product Tag Variant Assignment source comparison

| Surface | Supplied Odoo source | Core3 bounded result |
| --- | --- | --- |
| Product Tag model | `product/models/product_tag.py`, `product_product_ids` many-to-many | `ecommerce_product_tag_variants` durable relation with stable IDs |
| List/action | `product/views/product_tag_views.xml`, Product Tags list and `product_tag_action` | Product Tags ListView adds variant count/name columns and row assign/remove actions |
| Variant domain | Odoo requires attribute-bearing variants and excludes variants covered by selected templates | Core3 requires active non-empty combination variants and applies current-company scope |
| Website rendering | `website_sale/models/product_tag.py`, `website_sale/controllers/variant.py` union template/variant tags | API projection returns template and variant assignments separately; variant-specific website rendering remains follow-up scope |
| Permission/concurrency | Odoo write access and relational updates | `ecommerce.read` option/projection sources, `ecommerce.write` assign/remove, duplicate/missing guards, tag row-version checks |
| Odoo visual comparison | Authenticated `/shop` on ports 8069 and 8073 | Exact 404 on both references at desktop/mobile; paired comparison blocked |
