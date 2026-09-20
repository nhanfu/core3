# Browser and Odoo check

## Core3

Authenticated desktop (`1440x900`) and mobile (`390x844`) capture was
attempted against the local Core3 runtime. At verification time the existing
`bun dev --db=ddb --memory`/Vite processes had no listening Core3 HTTP port;
`127.0.0.1:3000`, `127.0.0.1:4312`, and `127.0.0.1:4313` all refused the
connection. Therefore no authenticated Core3 rendered-page pass or screenshot
is claimed. The prior shared runtime/discovery boundary remains an explicit
blocker, and no other module was changed to repair it.

## Odoo

Exact unauthenticated HTTP probes of the supplied references returned:

```text
http://127.0.0.1:8069/shop -> HTTP 404
http://127.0.0.1:8073/shop -> HTTP 404
```

The supplied reference databases do not expose the Website/eCommerce `/shop`
surface, so authenticated desktop/mobile paired comparison is blocked. This
slice does not claim Odoo parity sign-off.
