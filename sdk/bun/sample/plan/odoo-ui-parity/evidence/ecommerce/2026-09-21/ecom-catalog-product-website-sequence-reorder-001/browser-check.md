# Browser and Odoo check

No authenticated browser evidence could be captured in this environment.
The persistent `js_repl` browser runtime was unavailable. Direct probes found
no Core3 listener on ports 3000, 4312, or 4313; the product detail probe at
`/ecommerce/products/detail?id=ecommerce-product-mug` therefore returned
connection refused (curl status 000).

The supplied Odoo probes returned exact HTTP 404 for `/shop` on both
`127.0.0.1:8069` and `127.0.0.1:8073`. Consequently authenticated Odoo/Core3
desktop/mobile comparison is blocked and no UI sign-off is claimed. The
source comparison and persistence/API evidence remain valid for this bounded
slice.
