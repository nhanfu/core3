# ECOM-CATALOG-WISHLIST-MERGE-001 evidence

Bounded Ecommerce slice: Odoo `website_sale_wishlist` login-session merge.

- Odoo source: `_check_wishlist_from_session()` removes duplicate session
  products, assigns remaining rows to the logged-in partner, and pops the
  session wishlist key; `res_users.py` invokes the hook during login.
- Core3 API: `merge_ecommerce_wishlist_session` in
  `services/ecommerce/api/wishlist.yaml`, joined to the existing page by
  `page.id: ecommerce-wishlist`.
- Durable data: migration `20260920320000-064-ecommerce-wishlist-merge-demo.yaml`
  seeds one duplicate Mug and one unique Lamp in an anonymous session.
- Focused proof: `test/ecommerce_wishlist_merge.integration.test.ts` — 3
  tests, 19 assertions.
- Core3 authenticated desktop/mobile and Odoo paired rendering are blocked as
  recorded in `browser-check.md`; no UI sign-off is claimed.

This is a bounded verified slice, not Ecommerce module sign-off. Binding the
action to the shared auth login event remains an explicit follow-up.
