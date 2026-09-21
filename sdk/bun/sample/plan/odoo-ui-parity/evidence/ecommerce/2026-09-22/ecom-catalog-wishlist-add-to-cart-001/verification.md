# Verification

Authenticated browser reference:

- URL: `http://localhost:8069/shop/wishlist`
- Database: `core3_reference`
- BrowserSkill instance: `245ea108`
- Desktop capture: `odoo-desktop-wishlist-add-to-cart-404.png`
- Mobile capture: `odoo-mobile-wishlist-add-to-cart-404.png` after iPhone-14
  emulation (observed viewport 390x844)

Both captures show Odoo's authenticated Error 404 page. The supplied database
does not have Website Sale/Wishlist installed, so the source-backed Wishlist
card and Add to Cart interaction cannot be rendered live. Core3 browser
verification was checked against the shared runtime boundary; `ss -ltnp`
found no listener on ports 3000, 4312, or 4313. No visual parity claim is
made.
