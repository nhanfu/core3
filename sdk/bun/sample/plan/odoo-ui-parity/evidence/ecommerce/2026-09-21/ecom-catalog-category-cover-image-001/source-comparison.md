# Source comparison

## Odoo

- `addons/website_sale/models/product_public_category.py` defines
  `product.public.category.cover_image` as an image field.
- `addons/website_sale/views/product_public_category_views.xml` includes the
  cover image in the category form and uses the category image projection in
  the category view/action `product_public_category_action`.
- `addons/website_sale/controllers/main.py` exposes
  `/snippets/category/set_image` and `set_category_image`, assigning the
  submitted image data to `category.cover_image`.

## Core3 mapping

- Migration `084` adds company and cover-image metadata to
  `ecommerce_categories`; migration `085` replays a deterministic Accessories
  cover fixture.
- `pages/categories.yaml` and `api/categories.yaml` remain the list pair;
  `pages/category-detail.yaml` and `api/category-detail.yaml` are the detail
  pair joined by `page.id: ecommerce-category-detail`.
- The detail API has separate read, upload, download, and remove actions.
  Upload and removal require `ecommerce.write`; reads and downloads require
  `ecommerce.read`.
- Binary bytes are stored through the Ecommerce attachment route while the
  category row durably stores filename, MIME, size, storage key, uploader,
  timestamp, company, and row version.

The implementation is intentionally bounded to one category cover image. It
does not claim full public `/shop` category rendering or Odoo image-editor
parity.
