# Verification

The deterministic Feedback Form returned
`Thank you for completing the Feedback Form.` in the public survey payload
after submit. The same copy was returned for the submitted answer token after
reopening file-backed DuckDB. Two concurrent submissions with one idempotency
key converged on one response; a wrong token returned 404 without mutation.

Authenticated Core3 login as `admin@tms.local` and `/api/auth/me` returned 200
at both 1440x900 and 390x844. The authenticated public API returned 404
`API route not found`, and the rendered public route returned 401
`Unauthorized`. Odoo returned HTTP 200 only after redirecting the public token
to `/web/login?redirect=%2Fodoo%3F` at both viewports. No visual or paired
Odoo completion-message sign-off is claimed.
