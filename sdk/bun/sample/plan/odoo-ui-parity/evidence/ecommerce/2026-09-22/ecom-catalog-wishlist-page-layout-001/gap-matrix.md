# Gap matrix

| Gap | Change | Verification |
| --- | --- | --- |
| No durable Wishlist Page layout setting | Add company-scoped policy table and deterministic fixture | migrations 166/167; restart test |
| No separate configuration contract | Add `pages/wishlist-page-layout-policy.yaml` and matching API page id | schema test |
| No guarded layout mutation | Add `ecommerce.wishlist.page_layout.update` with permission, company, value, and row-version guards | focused integration test |
| Wishlist page did not expose effective layout | Add read-only layout datasource/form after existing item ListView | Wishlist contract regression and projection assertion |
| No visual comparison target | Capture exact authenticated Odoo desktop/mobile 404 and record missing addon | browser captures; no visual sign-off |

Remaining blocker: the local Core3 runtime is unavailable on ports 3000, 4312,
and 4313, so rendered Core3 desktop/mobile screenshots cannot be captured.
