# Browser and Odoo comparison

Authenticated Core3 desktop and mobile captures were attempted as part of the
QA inventory, but no persistent `js_repl` browser runtime is available in this
workspace and ports `3000`, `4312`, and `4313` refuse connections. There are
no browser screenshots to claim.

Exact Odoo route probes:

```text
http://127.0.0.1:8069/shop -> HTTP 404
http://127.0.0.1:8073/shop -> HTTP 404
```

The Odoo `/shop` blocker prevents authenticated desktop/mobile comparison.
This is an explicit blocker, not a parity sign-off.
