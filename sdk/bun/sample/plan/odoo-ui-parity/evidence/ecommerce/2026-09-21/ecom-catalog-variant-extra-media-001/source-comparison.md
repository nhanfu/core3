# Source comparison

## Odoo

The supplied `website_sale/models/product_image.py` defines the `product.image`
record and its `product_variant_id` relation. The supplied
`website_sale/models/product_product.py` exposes
`product_variant_image_ids`; `_get_images()` orders the main variant image,
variant extra images, and template extra images; and
`_get_extra_image_1920_urls()` includes variant media first. The variant form in
`website_sale/views/product_views.xml` renders the `product_variant_image_ids`
field as an “Extra Variant Media” viewer. The supplied
`website_sale/controllers/variant.py` returns a rendered `carousel` when the
selected combination changes.

## Core3

Core3 migrations 074/075 add `ecommerce_product_variant_images` with stable
variant/product ownership, image metadata, storage key, sequence, timestamps,
and row version, plus a deterministic Mug Blue fixture. The Product Variant
API lists only active variant media in the current company and exposes
`ecommerce.write` upload/remove actions. Upload validates active product and
company scope, image MIME/size, unique filename, and the current variant row
version; removal validates the image row version and company scope. The
dedicated Product Variant page renders the attachment viewer and media list,
while Product Detail navigates to it from the variant list.
