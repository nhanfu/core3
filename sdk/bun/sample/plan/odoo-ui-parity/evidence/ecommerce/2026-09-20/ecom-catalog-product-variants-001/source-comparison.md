# Product Variants source comparison

| Surface | Supplied Odoo source | Core3 bounded result |
| --- | --- | --- |
| Menu/action/model | `product/views/product_views.xml`, `product_variant_action`, model `product.product` | Product detail variant list and API datasource use Ecommerce page/API YAML separation |
| Website variant behavior | `website_sale/views/product_views.xml`, `website_sale/models/product_product.py` | Durable variant name/reference/combination/attribute values, active state, and variant sales price |
| Attribute price | `website_sale/models/product_template_attribute_value.py` | Variant `sales_price` is persisted and takes precedence over template price in cart resolution |
| Combination resolution | `website_sale/controllers/product_configurator.py` | Combination key is durable and unique per product; full configurator endpoint remains follow-up scope |
| Persistence and actor boundary | Odoo `product.product` records and website/company context | Migrations 048/049, `ecommerce.read` datasource, `ecommerce.write` CRUD, company and stale guards |
| Odoo visual comparison | Authenticated `/shop` on ports 8069 and 8073 | Exact 404 on both references at desktop/mobile; paired comparison blocked |
