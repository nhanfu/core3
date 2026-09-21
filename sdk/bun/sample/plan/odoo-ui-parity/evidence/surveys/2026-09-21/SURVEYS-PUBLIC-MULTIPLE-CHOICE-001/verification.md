# Verification notes

The implementation was tested against a file-backed DuckDB database with the
complete migration set applied and reapplied after reopening. Invalid option
sets leave `answer_data` unchanged; the valid `Desk` + `Monitor` selection is
durable; concurrent submissions with one idempotency key produce one submitted
response and one survey count increment.

The browser probe attempted authenticated Core3 desktop (1440x900) and mobile
(390x844) routes, but the isolated runtime did not expose the requested
frontend/backend listener and Playwright recorded `ERR_CONNECTION_REFUSED`.
Odoo desktop/mobile reached only the login shell; the exact redirect and proxy
failure are recorded in `odoo-blocker.json`. No visual or Odoo parity sign-off
is claimed.
