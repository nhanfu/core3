# Product Tag Images evidence

- Feature: `ECOM-CATALOG-PRODUCT-TAG-IMAGE-001`
- Date: 2026-09-20
- Core3: authenticated `admin@tms.local` / `Core3 Demo Company`, isolated
  Ecommerce runtime at `http://127.0.0.1:4312`
- Odoo: authenticated `codex@core3.local` / `core3_codex_demo`, references at
  ports 8069 and 8073

Core3 desktop and mobile captures show the Product Tags list opening the
image-capable tag detail form. The desktop flow uploads the deterministic
existing SVG fixture through the rendered `image/*` file control; the detail
form then shows the persisted filename and size. The mobile capture confirms
the list remains readable.

Both authenticated Odoo references returned exact HTTP 404 for `/shop` at
desktop and mobile viewports, so the paired visual comparison is blocked by
the supplied reference database rather than treated as a pass.

Images:

- `core3-desktop-tags.png`
- `core3-desktop-tag-detail.png`
- `core3-desktop-tag-image-uploaded.png`
- `core3-mobile-tags.png`
- `core3-mobile-tag-detail.png`
- `odoo-8069-desktop-shop-404.png`
- `odoo-8069-mobile-shop-404.png`
- `odoo-8073-desktop-shop-404.png`
- `odoo-8073-mobile-shop-404.png`
