# Browser and Odoo check

- Core3 authenticated desktop/mobile evidence: **blocked**. Ports
  `3000`, `4312`, and `4313` refuse connections and no persistent browser
  runtime is available. No screenshots or rendered UI sign-off are claimed.
- Odoo comparison: `curl -sS -o /dev/null -w '%{http_code}'` against
  `/shop` on ports `8069` and `8073` returns exact HTTP `404` for both
  endpoints. The authenticated Odoo product-page comparison is therefore
  blocked by the supplied runtime/discovery boundary.
