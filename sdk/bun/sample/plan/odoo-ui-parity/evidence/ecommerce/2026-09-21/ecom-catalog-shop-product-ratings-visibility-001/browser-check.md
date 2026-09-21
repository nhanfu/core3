# Browser and Odoo checks

- Browser tool: `bsk`, authenticated session, fresh observe after navigation.
  Comparison target was exactly `http://localhost:8069` using database
  `core3_reference`, container `odoo-core3-reference`, and the supplied
  `codex@core3.local` QA login. No password was extracted, printed, logged,
  captured, or committed.
- Desktop: fresh Odoo `/shop` observe reported `Error 404` at viewport
  `1916x833`; screenshot:
  `odoo-shop-404-desktop.png`.
- Mobile: fresh Odoo `/shop` observe after `iphone-14` emulation reported
  `Error 404` at viewport `390x844`; screenshot:
  `odoo-shop-404-mobile.png`.
- The `bsk` session was stopped cleanly after capture. The authenticated
  `/shop` 404 prevents the Website Sale product-card and builder control from
  being rendered for comparison, so no visual sign-off is claimed. Core3
  rendered evidence is also not claimed because its runtime was unavailable.
