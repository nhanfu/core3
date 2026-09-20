# SURVEYS-ACTOR-MATRIX-001 QA inventory

Date: 2026-09-20

## Core3 actor and lifecycle evidence

| Actor/surface | Result | Evidence |
| --- | --- | --- |
| Administrator, desktop | Added and reloaded a durable question at 1440x1000; sequence 8; no page/request/HTTP errors; no overflow | `core3-admin-desktop-before.png`, `core3-admin-desktop-form.png`, `core3-admin-desktop-after.png` |
| Administrator, mobile | Reloaded the desktop row, added a second durable question at 390x844; sequence 9; no page/request/HTTP errors; no overflow | `core3-admin-mobile-before.png`, `core3-admin-mobile-form.png`, `core3-admin-mobile-after.png` |
| Fleet ordinary user, mobile | Read boundary returned 403 and `Requires permission: surveys.read`; no survey content disclosed | `core3-fleet-denied-mobile.png` |
| Anonymous, mobile | Protected route redirected to the login form with the original route encoded | `core3-anonymous-mobile.png` |

The service-level CRUD and restart contract remains covered by
`test/surveys_question_create.integration.test.ts`: ordered creation,
permission declaration, validation/stale/archive guards, and file-backed
reload. The migration rollback gate is covered by
`test/surveys_migrations.integration.test.ts`.

## Odoo comparison blocker

Authenticated desktop and mobile probes reached the local Odoo server, but
`/odoo/surveys` redirected to `/odoo/discuss`; the live `core3_reference`
database has the Surveys addon uninstalled. The captures show the authenticated
fallback at both viewports and are not a paired Survey comparison:
`odoo-desktop-fallback.png` and `odoo-mobile-fallback.png`. The desktop probe
also recorded an aborted `POST /mail/data` request while loading Discuss; this
does not provide a Surveys surface to compare.

## Scope disposition

The Core3 actor matrix is evidenced and the Odoo blocker is exact and
reproducible. This slice is conditional, not module sign-off: paired Odoo
desktop/mobile Survey evidence and the remaining broader public/participant
coverage stay open.
