# Verification

Core3 raw results are in `core3-browser-results.json`. At both 1440x900 and
390x844, authenticated login and `/api/auth/me` returned HTTP 200. The
authenticated direct public API returned HTTP 404 `API route not found` and
the rendered `/survey/start/4ead4bc8-b8f2-4760-a682-1fde8ddb95ac` route returned
HTTP 200 with body `Unauthorized`. Both captures had no horizontal overflow or
failed browser requests. The fresh Core3 process was stopped after capture.

Odoo raw results are in `odoo-browser-results.json`. At both requested
viewports, the public token route returned HTTP 200 only after redirecting to
`http://127.0.0.1:8069/web/login?redirect=%2Fodoo%3F`; the body is the login
form, not an authenticated Survey. The installed/reference environment
therefore has no usable authenticated Survey Date fixture for a paired
mutation or visual comparison.

These are exact runtime/reference blockers, not test failures. No parity
sign-off is claimed.
