# Source comparison

Odoo's Surveys controller exposes the public session helper routes `/s` and
`/s/<session_code>`. Core3 already had durable token-scoped join and current-
question answer mutations in the `survey-live-session-join` page/API pair.
This slice closes the rendered-route gap by binding those contracts to `/s`
and `/s/<session_code>` in `public/app.ts` and
`public/components/PublicLiveSession.ts`.

The Odoo disposable reference comparison is blocked by the exact runtime
result recorded in `odoo-browser-results.json`: both `127.0.0.1:8072/s/5822`
probes returned `net::ERR_CONNECTION_REFUSED`.
