# Browser and Odoo check

## Core3 authenticated desktop/mobile

The requested authenticated desktop (`1440x900`) and mobile (`390x844`)
capture was attempted for the wishlist login-merge surface. At verification
time no Core3 HTTP listener was available: `/api/modules` refused connections
on ports 3000, 4312, and 4313. No rendered UI pass or screenshot is claimed;
the shared runtime/discovery boundary was not modified.

## Odoo comparison

Exact HTTP probes of the supplied references returned:

```text
http://127.0.0.1:8069/shop -> HTTP 404
http://127.0.0.1:8073/shop -> HTTP 404
```

The supplied reference databases do not expose the Website/eCommerce `/shop`
surface, so authenticated desktop/mobile paired comparison is blocked. This
is preserved as a blocker rather than treated as parity sign-off.
