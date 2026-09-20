# Evidence verification

## Core3

Authenticated Core3 browser probes used the source-served admin and public
routes at `1440x900` and `390x844`. Both viewport records report no request or
page failures and no horizontal overflow. The public control reports
`type=email`, `inputmode=email`, `autocomplete=email`, `minLength=6`, and
`maxLength=80`. The invalid desktop probe displays the seeded validation message
without a failed request.

Artifacts: `core3-browser-results.json`,
`core3-admin-{desktop,mobile}.png`,
`core3-public-{desktop,mobile}.png`, and
`core3-public-invalid-desktop.png`.

## Odoo reference

Both desktop and mobile probes to `http://127.0.0.1:8069/odoo/surveys` returned
HTTP 200 but landed on
`http://127.0.0.1:8069/web/login?redirect=%2Fodoo%2Fsurveys%3F` with only the
login shell. The alternate reference proxy at `127.0.0.1:8072` was unavailable
with connection refusal. No authenticated Surveys installation or fixture was
available; `odoo-blocker.json` and `odoo-{desktop,mobile}.png` preserve this
exact blocker. No Odoo parity sign-off is claimed.
