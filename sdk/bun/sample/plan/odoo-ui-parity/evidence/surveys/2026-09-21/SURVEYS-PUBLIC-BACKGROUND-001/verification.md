# Browser and reference verification — `SURVEYS-PUBLIC-BACKGROUND-001`

Core3 source-served runtime used backend port 3390 and Vite port 3391. Authenticated `admin@tms.local` probes captured the Surveys admin shell and public `Brand Survey` landing at 1440x900 and 390x844. Both public probes observed the persisted background URL as the computed CSS image, asset HTTP 200 with `image/svg+xml; charset=utf-8`, no request/page failures after authentication, and no horizontal overflow.

Odoo comparison at `http://127.0.0.1:8069/odoo/surveys` returned HTTP 200 at `/web/login?redirect=%2Fodoo%2Fsurveys%3F` for both viewports. Supplied local credentials were rejected, so no authenticated Surveys screen or mutation comparison was available. The disposable proxy at `127.0.0.1:8072` was connection-refused. No Odoo parity sign-off is claimed.
