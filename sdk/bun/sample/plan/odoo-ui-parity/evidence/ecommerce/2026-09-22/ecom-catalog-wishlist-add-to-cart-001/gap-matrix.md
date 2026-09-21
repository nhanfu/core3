# Gap matrix

| Gap | Prior Core3 state | Change | Verification |
| --- | --- | --- | --- |
| Saved wishlist product could not enter Cart | Wishlist API had only add/remove/merge | Add permissioned add-to-cart mutation with durable cart create/reuse and quantity merge | `ecommerce_wishlist.integration.test.ts` |
| Wishlist row could survive a successful cart add | No workflow coupling | Delete the exact row with its expected version after cart mutation | Focused success/restart cases |
| Ownership/state failures were unspecified | No cart workflow guards on Wishlist | Add customer/company, stale/missing, publication, variant, zero-price, and open-cart guards | Focused guard case |
| Odoo redirect behavior was absent | No redirect result | Return deterministic `/ecommerce/cart` intent and refresh both datasource families | Focused contract case |
| Visual parity could not be compared | Odoo reference lacks Website Sale/Wishlist; Core3 ports unavailable | Preserve exact blocker captures and make no visual claim | `verification.md` |
