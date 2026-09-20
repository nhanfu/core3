# Browser and Odoo check

## Core3 authenticated desktop/mobile

The requested authenticated Product Detail capture at desktop (`1440x900`) and
mobile (`390x844`) was attempted. No Core3 HTTP listener was available:
`/api/modules` refused connections on ports 3000, 4312, and 4313 (HTTP 000
connection failures). No rendered optional-product pass or screenshot is
claimed; shared runtime/discovery files were not modified.

## Odoo comparison

Exact HTTP probes of the supplied references returned:

```text
http://127.0.0.1:8069/shop -> HTTP 404
http://127.0.0.1:8073/shop -> HTTP 404
```

The supplied reference databases do not expose the Website/eCommerce `/shop`
surface, so authenticated desktop/mobile paired comparison is blocked.
