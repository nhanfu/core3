# Source comparison

## Odoo Website Sale

- `addons/product/models/product_document.py` defines the persisted
  `product.document` model backed by `ir.attachment`, with `active` and
  `sequence` lifecycle fields.
- `addons/website_sale/models/product_document.py` adds
  `shown_on_product_page` and rejects publishing documents restricted to one
  `product.product` variant.
- `addons/website_sale/views/product_document_views.xml` adds the Ecommerce
  publish toggle to the product document form/list/kanban/search surfaces.
- `addons/website_sale/controllers/main.py` exposes the public
  `/shop/<product.template>/document/<document_id>` download route and checks
  active state, template ownership, and `shown_on_product_page` before serving
  the attachment.

## Core3 mapping

- Migrations `082` and `083` add `ecommerce_product_documents` and the stable
  `Mug Care Guide` fixture.
- `api/product-detail.yaml` lists product documents and declares create,
  navigate, and delete actions. `pages/product-detail.yaml` renders the
  document list separately from its API.
- `api/product-document-detail.yaml` and
  `pages/product-document-detail.yaml` provide the document detail/upload/
  download/edit/delete pair. `storage.yaml` scopes downloads to active
  documents, active products, and the authenticated company when supplied.
- Core3 intentionally bounds this slice to binary document replacement and
  product-template publication. Odoo URL documents, variant-specific
  publication, and the public `/shop/.../document/...` route are not claimed as
  complete.
