# Browser verification

Browser instance: `245ea108`.

Odoo was authenticated at `http://localhost:8069` in database
`core3_reference`. The Expenses app loaded with the My Expenses action and
seeded records whose list rows expose activity indicators. The desktop capture
is the authenticated Activity view; the mobile run loaded the authenticated
My Expenses responsive list without overflow.

The desktop PNG was encoded as 1916x833 by BrowserSkill rather than the
requested 1440x900. The mobile emulation observation reported 390x844, but the
BrowserSkill screenshot encoder also emitted a 1916x833 PNG. The mobile file is
therefore retained as an attempted capture, but no 390x844 pixel-parity claim
is made. This is an evidence-tool limitation, not an Odoo module blocker.

Core3 blocker: no authenticated Core3 interaction was claimed for this commit.
The available shared browser state reached the Core3 auth shell on port 3002,
but its buffered requests included `GET /api/modules` 502 and
`GET /api/pages/dashboard?lc=en` 404, and no authenticated Expenses detail
interaction was reached. The existing plan's Core3 login/runtime blocker is
preserved. No password, cookie, token, or secret is recorded.
