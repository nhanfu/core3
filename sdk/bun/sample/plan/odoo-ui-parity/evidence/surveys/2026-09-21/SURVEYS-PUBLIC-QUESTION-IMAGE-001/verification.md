# Browser and reference verification — `SURVEYS-PUBLIC-QUESTION-IMAGE-001`

Core3 runtime verification completed after the initial shared-boundary error was repaired. Authenticated desktop and mobile probes loaded the Surveys catalog and the public `Image Choice Survey` at 1440x900 and 390x844. The image URL was rendered from the public question metadata, returned HTTP 200 with `image/svg+xml`, had a natural width of 267 pixels, and produced no request failures, page errors, or horizontal overflow. The exact probe output is in `core3-browser-results.json` and the captures are `core3-{admin,public}-{desktop,mobile}.png`.

Odoo probes at `http://127.0.0.1:8069/odoo/surveys` for 1440x900 and 390x844 returned HTTP 200 at `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; no authenticated question-image fixture was available. Supplied local credentials were not used to claim access, and the disposable proxy at `127.0.0.1:8072` was connection-refused. No paired Odoo sign-off is claimed.
