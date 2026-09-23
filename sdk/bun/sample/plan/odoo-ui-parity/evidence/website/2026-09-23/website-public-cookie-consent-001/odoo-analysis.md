# Odoo source analysis

Source examined from the local Odoo 19 checkout:

- `addons/website/views/website_templates.xml`: `cookies_bar` inherits the
  Website layout and renders `website_cookies_bar` after the footer when
  `website.cookies_bar` is enabled. The discrete banner provides a cookie
  policy link, `Only essentials`, and `I agree` controls.
- `addons/website/static/src/interactions/cookies/cookies_bar.js`:
  `CookiesBar.onAcceptClick` writes the required/optional/timestamp JSON shape;
  essential consent denies optional cookies and all consent grants them.
- `addons/website/static/src/interactions/popup/popup.js`: the consent cookie
  lifetime is `data-consents-duration * 24 * 60 * 60`; the Website template
  supplies `data-consents-duration="999"`.
- `addons/website/models/ir_http.py`: optional cookie access is allowed when
  the bar is disabled or the parsed `website_cookies_bar` value has
  `optional: true`; malformed legacy values are expired.
- `addons/website/models/website.py`: when the bar and third-party blocking are
  enabled and optional consent is absent, third-party scripts/iframes are
  controlled.

The public frontend is anonymous; no Odoo user permission is required for the
consent choice itself.
