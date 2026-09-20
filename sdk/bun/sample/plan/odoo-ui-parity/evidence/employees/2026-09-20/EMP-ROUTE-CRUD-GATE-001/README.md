# EMP-ROUTE-CRUD-GATE-001 evidence

This gate ran on 2026-09-20 with authenticated Admin (`admin@tms.local`) and
Fleet (`fleet@tms.local`) Core3 actors against a clean temporary runtime of
committed Employees HEAD `cac5db24`. The shared checkout had an unrelated
uncommitted Timesheets page-schema error, so it was not used for browser
serving and no other module file was changed.

Core3 covers all 28 registered Employees routes at 1440x1000 and 390x844 in
`core3-route-matrix.json`. The authenticated CRUD smoke creates `EMP-GATE-001`,
edits its title, archives it, and restores it. `core3-actor-matrix.json`
records Admin access, Fleet 403 boundaries, and unauthenticated login
redirect. The matrix and smoke had no settled page errors, failed requests,
HTTP errors, blank states, or overflow; the mobile All activities route was
rechecked after a 3.5 second settle because it is lazy-loaded.

Odoo was authenticated against `core3_reference` with the local QA account
(credentials are not stored here). Employees list and Abigail Peterson detail
were captured at desktop and mobile sizes in `odoo-comparison.json` and the
paired PNGs. Odoo had no failed requests or page errors in those captures.

No new missing source-backed Employees feature was found in this gate. The
module remains conditionally signed off pending aggregate parity review.
