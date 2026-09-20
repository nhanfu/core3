# Browser verification

Core3 browser results are in `core3-browser-results.json`. Authenticated
desktop and mobile probes submit deterministic answers through the browser's
authenticated API context, reload the page, render `Answer state: Answered`,
and report zero `Network.loadingFailed` events and no horizontal overflow.

Odoo browser results are in `odoo-browser-results.json`. Both authenticated
viewports render `Enter Session Code / Join Session` at `/s/5822`; the exact
JSON-RPC validator response is HTTP 200 with
`{"error":"survey_wrong"}`. No corresponding Odoo live session exists, so
there is no honest attendee-answer comparison or sign-off.
