# Verification

Authenticated browser reference:

- URL: `http://localhost:8069/shop/wishlist?db=core3_reference`
- Database: `core3_reference`
- Browser: instance `245ea108`, authenticated shared QA session, bsk session
  used only for this verification.
- Desktop capture: `odoo-desktop-wishlist-404.png` (1916x833).
- Mobile capture: `odoo-mobile-wishlist-404.png` (390x844, iPhone-14
  emulation).

Both captures show Odoo's authenticated `Error 404` page. Website Sale and
Wishlist are not installed in the supplied reference database, so the builder,
Wishlist page, and responsive layout cannot be compared. Core3 browser
verification is separately blocked because ports 3000, 4312, and 4313 refuse
connections. No visual parity claim is made.
