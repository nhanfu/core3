# Browser and Odoo check

Authenticated browser evidence could not be captured. The persistent
`js_repl` Playwright runtime is unavailable, and direct Core3 probes to
`/ecommerce/product-feeds` on ports 3000, 4312, and 4313 returned connection
refused (`curl` HTTP 000). No Core3 desktop or mobile screenshot/sign-off is
claimed.

The supplied Odoo probes returned exact HTTP 404 for `/shop` on
`127.0.0.1:8069` and `127.0.0.1:8073`. Authenticated Odoo/Core3 desktop/mobile
comparison is therefore blocked. The source comparison and durable/API
evidence remain valid for this bounded slice.
