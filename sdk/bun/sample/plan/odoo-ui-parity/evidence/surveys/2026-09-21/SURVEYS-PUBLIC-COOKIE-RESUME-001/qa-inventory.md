# QA inventory

| Surface | Result | Evidence |
| --- | --- | --- |
| Core3 authenticated desktop, 1440x900 | Login succeeded as `admin@tms.local`; public API returned 404 `API route not found` | `core3-authenticated-desktop-cookie-resume.png`, `core3-browser-results.json` |
| Core3 authenticated mobile, 390x844 | Login succeeded as `admin@tms.local`; public API returned 404 `API route not found` | `core3-authenticated-mobile-cookie-resume.png`, `core3-browser-results.json` |
| Core3 anonymous public API | HTTP 401 `Unauthorized` from the fresh runtime | `runtime-blocker.json` |
| Odoo desktop, 1440x900 | HTTP 200, host-controlled Feedback Form waiting state | `odoo-desktop-cookie-resume.png`, `odoo-browser-results.json` |
| Odoo mobile, 390x844 | HTTP 200, host-controlled Feedback Form waiting state | `odoo-mobile-cookie-resume.png`, `odoo-browser-results.json` |
| Durable contract/restart/concurrency | Pass: 3 focused tests, 200 assertions in the adjacent public suite | `test-results.md` |

No parity sign-off is claimed while the Core3 public route registry and a
mutable Odoo participant fixture remain unavailable.
