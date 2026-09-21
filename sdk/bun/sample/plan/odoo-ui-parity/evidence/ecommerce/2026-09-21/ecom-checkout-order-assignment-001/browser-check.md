# Browser and Odoo check

No authenticated Core3 desktop/mobile screenshots were captured in this
environment. Core3 ports 3000, 4312, and 4313 refused connections, and the
session has no persistent browser runtime (`js_repl`) available for an
authenticated actor journey.

The supplied authenticated Odoo references were probed at `/shop`:

```text
http://127.0.0.1:8069/shop -> HTTP 404
http://127.0.0.1:8073/shop -> HTTP 404
```

The references therefore do not expose the Website/eCommerce route needed for
paired Orders Assignment rendering. Browser and paired Odoo gates remain
explicit blockers; no UI sign-off is claimed.
