# Verification

The fresh Core3 process could not start. Its exact startup error was:

```text
PageSchemaError: Invalid page definition:
- components[0].search.categories is not allowed
- components[0].search.or locations... is not allowed
```

Both requested Core3 viewport navigations therefore ended with
`ERR_CONNECTION_REFUSED` at `127.0.0.1:4341`; no Core3 visual sign-off is
claimed. The process exited and no long-running runtime remains.

Odoo raw results are in `odoo-browser-results.json`. At both requested
viewports, the public token route returned HTTP 200 only after redirecting to
`http://127.0.0.1:8069/web/login?redirect=%2Fodoo%3F`; the body is the login
form, not an authenticated Survey. The installed/reference environment has no
usable authenticated Scale fixture for a paired mutation or visual comparison.

These are exact runtime/reference blockers, not Scale test failures. No parity
sign-off is claimed.
