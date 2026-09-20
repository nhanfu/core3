# `SURVEYS-PUBLIC-NUMERICAL-QUESTION-001`

Bounded slice: Odoo-compatible public Numerical question range validation.

Evidence: `qa-inventory.md`, `source-comparison.md`, `test-results.md`,
`verification.md`, `core3-browser-results.json`,
`core3-{admin,public}-{desktop,mobile}.png`,
`core3-public-invalid-desktop.png`, `odoo-blocker.json`, and
`odoo-{desktop,mobile}.png`.

Core3 authenticated admin and public renderer evidence passed at 1440x900 and
390x844. The public numeric control exposes `min=1.5`, `max=10.5`,
`step=any`, and the client rejects `11.1` with the persisted Odoo-style
validation message. Odoo remains conditional: both reference probes redirect
to login and the disposable 8072 proxy is unavailable; no parity sign-off is
claimed.
