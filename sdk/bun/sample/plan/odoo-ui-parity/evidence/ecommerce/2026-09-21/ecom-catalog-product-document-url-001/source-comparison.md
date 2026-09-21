# Source comparison

- Odoo `addons/product/models/product_document.py` defines `product.document`
  through `ir.attachment` inheritance, which supports URL attachments.
- Odoo `addons/website_sale/models/product_document.py` adds
  `shown_on_product_page`; `views/product_document_views.xml` exposes the
  website publication control.
- Odoo `views/templates.xml` renders URL attachments with a link icon and a
  new-tab target.
- Odoo `controllers/main.py` exposes
  `/shop/<product.template>/document/<document_id>` and requires an active,
  published document attached to the requested product template.
- Core3 migrations `20260921300000-124` and `20260921301000-125` add durable
  URL state and a deterministic fixture. The existing document page/API are
  joined by `page.id`; the public operation and Ecommerce module route provide
  the validated redirect boundary.

The supplied Odoo runtime was not available for an authenticated rendered
comparison.
