# Verification

## BrowserSkill

BrowserSkill `bsk doctor` and `bsk status --json` passed with one connected
browser instance `245ea108`; no credentials, cookies, or tokens were read.
The available signed-in Odoo tab was owned by another session, so it was not
interrupted. A task-created tab in the same shared browser loaded
`http://localhost:8069/odoo/time-off`.

At desktop (`1916x833`) the page was the Discuss shell; capture:
`odoo-desktop-discuss-blocker.png`.

At mobile (`390x844`, iPhone-14 emulation) the page was the OdooBot Discuss
shell; capture: `odoo-mobile-discuss-blocker.png`.

This is an exact live blocker: the Time Off menu/action is unavailable in the
authenticated `core3_reference` session. No Odoo mutation was made. The
BrowserSkill session was stopped after capture, returning the task-created tab.

## Core3

The isolated Time Off runtime bound successfully on port 3017 and served the
route. The BrowserSkill task-created tab had no Core3 auth session:
`GET /api/auth/me` returned HTTP 401 and the app redirected to its sign-in
page. No independent login was attempted, and the login page's demo
credentials were not retained in evidence. Therefore no authenticated Core3
desktop/mobile visual parity claim is made.
