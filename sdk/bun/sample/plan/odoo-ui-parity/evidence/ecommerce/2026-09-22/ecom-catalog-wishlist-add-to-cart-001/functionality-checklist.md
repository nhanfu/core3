# Functionality checklist

| Case | Classification | Result | Evidence |
| --- | --- | --- | --- |
| Source button and interaction | functional | pass | `odoo-analysis.md` |
| Separate page/API binding | regression | pass | Focused test source-contract case |
| Visible Wishlist Add to Cart action | visual | implemented; Core3 capture blocked | `verification.md` |
| Owned open-cart quantity merge | workflow/data | pass | Focused test |
| Wishlist item removal after success | workflow/data | pass | Focused test |
| Cart redirect intent | workflow | pass | Focused test result `/ecommerce/cart` |
| Wrong customer/company | permission/security | pass | Focused guard test |
| Missing/stale wishlist item | data/workflow | pass | Focused guard test |
| Unpublished product and invalid variant | workflow | implemented; product boundary pass | API guards; variant path source-backed |
| Zero-price sale policy | workflow | implemented; guard declared | API guard; no fixture mutation needed |
| Missing/reused cart and restart | data/regression | pass | Focused restart test |
| Odoo desktop/mobile rendered comparison | visual/responsive | blocked | Authenticated 404 captures |
