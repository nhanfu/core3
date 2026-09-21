# Source comparison

| Odoo behavior | Core3 implementation | Status |
| --- | --- | --- |
| Wishlist card exposes `Add to Cart` | `pages/wishlist.yaml` exposes `add_to_cart_ecommerce_wishlist_item` | implemented |
| Saved template/variant goes through cart service | Wishlist API mutation resolves product/variant and merges durable cart line quantity | implemented |
| Wishlist row removed only after positive cart quantity | Mutation deletes the item after cart line update in one YAML mutation transaction | implemented |
| Last item redirects to Cart | Result returns `/ecommerce/cart`; page refreshes Wishlist and Cart datasources | implemented |
| Customer/company and stale guards | `ecommerce.write`, owner/company predicates, row-version and open-cart guards | implemented |
| Odoo public Wishlist rendered page | Existing Core3 management page requires `ecommerce.read` | bounded difference: auth-safe internal surface |
| Live Odoo visual state | `/shop/wishlist` is authenticated 404 in `core3_reference` | blocked by missing addon |
