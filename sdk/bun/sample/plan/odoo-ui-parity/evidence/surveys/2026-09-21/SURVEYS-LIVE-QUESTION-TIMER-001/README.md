# Surveys live-session question timer

Feature ID: `SURVEYS-LIVE-QUESTION-TIMER-001`

This bounded slice clones Odoo's live-session per-question timer: a durable
question start timestamp and time limit are returned by the paired session
API, the attendee renderer shows a countdown, and the answer mutation applies
the authoritative expiry guard before any answer or counter mutation.

The Core3 runtime was probed at `/s/5177` in authenticated desktop and mobile
topologies, but no service was listening on port 3000. Odoo port 8069 returned
the login shell for both viewports; the Surveys page could not be inspected
without authenticated installed Surveys access. Port 8072 refused the paired
proxy connection. No visual parity or module sign-off is claimed.

See `qa-inventory.md`, `source-comparison.md`, `test-results.md`, and
`verification.md` for the bounded evidence.
