# Browser check

Browser: authenticated bsk session on browser instance `245ea108`.
Reference: `http://localhost:8069`, database `core3_reference`.

- Desktop capture: authenticated `/shop` rendered Odoo `Error 404`; screenshot
  saved as `odoo-desktop-shop-404.png` at the 1916×833 desktop viewport.
- Mobile capture: authenticated `/shop` rendered the same Odoo `Error 404`
  after iPhone-14 emulation; screenshot saved as
  `odoo-mobile-shop-404.png`.
- Core3 capture: blocked. HTTP probes to ports 3000, 4312, and 4313 all
  returned connection refused; no Core3 visual claim is made.

The owned bsk session was stopped/expired after the bounded evidence probe.
No credentials, cookies, or tokens were extracted.
