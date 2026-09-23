# Verification

Core3 verification completed at the Website service boundary:

- GET with the deterministic Core3 Storefront and enabled cookie bar returns
  `show_banner: true` and `optional_cookies_allowed: false`.
- POST `choice: all` returns optional consent and a replayable
  `website_cookies_bar` cookie.
- POST `choice: essential` returns optional denial and a replayable cookie.
- Invalid cookies are expired rather than trusted.
- Unknown Websites, disabled bars, invalid choices, and unsupported methods are
  bounded error responses.

The public Website frontend was not visually verified. BrowserSkill could not
borrow the shared Odoo tab, and no independent browser backend was used.
See [`browser-check.md`](browser-check.md).
