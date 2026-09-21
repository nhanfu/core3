# Source comparison

| Odoo behavior | Core3 implementation | Status |
| --- | --- | --- |
| Website model stores 5 desktop columns, 2 mobile columns, and 16px gap | Migration 166 table plus migration 167 My Company fixture | implemented |
| Wishlist builder selects desktop 2–6 columns | `api/wishlist-page-layout-policy.yaml` options and guarded mutation | implemented |
| Wishlist builder selects mobile 1–2 columns | Same policy API/page contract | implemented |
| Wishlist builder gap range is 0–28px | Safe px options and regex guard | implemented |
| Wishlist template exposes layout values to responsive CSS | Wishlist API/page read-only projection exposes effective values | partial: Core3 renderer is runtime-blocked |
| Authenticated Wishlist Page visual states | Odoo reference route is authenticated 404; Core3 ports refuse connections | blocked |

The feature is distinct from `ECOM-CATALOG-PRODUCT-COMPARE-PRICE-001`,
`ECOM-CATALOG-PRODUCT-COMPARE-PRICE-VISIBILITY-001`,
`ECOM-CATALOG-WISHLIST-001`, `ECOM-CATALOG-WISHLIST-MERGE-001`, and
`ECOM-CATALOG-SHOP-PRODUCT-WISHLIST-VISIBILITY-001`.
