# Browser check

- Browser skill session: instance `245ea108`, authenticated Agent Window
  session used without extracting credentials, cookies, or tokens.
- Odoo target: `http://localhost:8069`, database `core3_reference`.
- Desktop: authenticated `/shop` returned Odoo's exact `Error 404` page at
  semantic viewport 1916×833. Capture: `odoo-desktop-shop-404.png`.
- Mobile: the same authenticated tab was emulated as `iphone-14`; `/shop`
  returned the exact same Odoo `Error 404` page at semantic viewport 390×844.
  Capture: `odoo-mobile-shop-404.png`.
- Blocker: Website Sale/eCommerce is not installed or routed in the supplied
  live database, so paired Wishlist feature rendering cannot be inspected and
  no visual parity sign-off is claimed.
- Core3 rendering blocker: ports 3000, 4312, and 4313 refuse connections;
  no Core3 desktop/mobile rendering evidence is claimed.
