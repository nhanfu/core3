# Source comparison

## Odoo

- `addons/website/models/mixins.py` defines the `website.seo.metadata` model
  with `website_meta_title`, `website_meta_description`,
  `website_meta_keywords`, `website_meta_og_img`, and the stored
  `is_seo_optimized` projection.
- `addons/website_sale/models/product_template.py` inherits
  `website.seo.metadata` for `product.template`.
- `addons/website/views/website_templates.xml` consumes the SEO object to
  render the title, description, keywords, OpenGraph, and Twitter metadata.

## Core3 mapping

- Migrations `088/089` add durable product SEO fields and deterministic Mug
  metadata.
- Product Detail remains a paired page/API YAML contract. Its API exposes the
  raw metadata and `is_seo_optimized`; its permissioned SEO form updates all
  four fields in one optimistic mutation.
- The mutation requires `ecommerce.write`, enforces current-company ownership,
  active row and expected-version guards, bounds all field lengths, rejects a
  JavaScript OpenGraph URL, and preserves values across restart.

The implementation is bounded to editable product SEO metadata. It does not
claim full website-head rendering, translation, SEO popup, or public `/shop`
route parity.
