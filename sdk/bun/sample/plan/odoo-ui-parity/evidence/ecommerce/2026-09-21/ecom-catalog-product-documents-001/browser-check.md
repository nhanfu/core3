# Browser/runtime check

Date: 2026-09-21

## Core3

Direct runtime probes returned HTTP `000` (connection refused/unavailable) for
the candidate authenticated Core3 routes on ports 3000, 4312, and 4313. The
session does not expose the required persistent `js_repl` Playwright runtime,
so no authenticated desktop `1440x900` or mobile `390x844` screenshots were
created and no rendered UI sign-off is claimed.

## Odoo reference

`curl http://127.0.0.1:8069/shop` returned **404** and
`curl http://127.0.0.1:8073/shop` returned **404**. The supplied authenticated
reference instances therefore cannot provide the Website Sale product-document
page for exact desktop/mobile comparison. This is the explicit Odoo `/shop`
blocker, not a parity pass.
