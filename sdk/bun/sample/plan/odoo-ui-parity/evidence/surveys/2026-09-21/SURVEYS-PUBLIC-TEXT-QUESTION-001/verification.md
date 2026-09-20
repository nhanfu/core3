# Evidence verification

## Core3

The custom Surveys module now exposes its delegate runtime context, and an
authenticated `/api/pages/surveys` probe returned HTTP 200. The isolated
desktop (`1440x900`) and mobile (`390x844`) browser attempts then stopped at the
development service-host boundary with `Service host unavailable`; the public
API's anonymous request returned HTTP 401 `UNAUTHORIZED`. The Text textarea was
therefore not claimed as visually verified. The runtime screenshots and
`core3-browser-results.json` preserve the exact conditional evidence.

## Odoo reference

Both desktop and mobile requests to `http://127.0.0.1:8069/odoo/surveys`
returned HTTP 200 but landed on
`http://127.0.0.1:8069/web/login?redirect=%2Fodoo%2Fsurveys%3F`, the login shell.
The alternate reference proxy at `127.0.0.1:8072` refused the connection.
There was no authenticated Odoo Surveys installation or Text fixture, so no
paired Odoo visual or parity sign-off is claimed.
