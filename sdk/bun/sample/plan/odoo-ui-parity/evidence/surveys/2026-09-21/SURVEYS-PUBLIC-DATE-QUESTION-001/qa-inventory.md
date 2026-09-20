# QA inventory

| Probe | State/claim | Evidence | Result |
| --- | --- | --- | --- |
| Core3 authenticated desktop, 1440x900 | Admin login, `/api/auth/me`, public API/page, overflow, failed requests | `core3-browser-results.json`, `core3-desktop.png` | login/me 200; API 404, rendered body Unauthorized; no overflow/request failures |
| Core3 authenticated mobile, 390x844 | Same public contract and responsive boundary | `core3-browser-results.json`, `core3-mobile.png` | login/me 200; API 404, rendered body Unauthorized; no overflow/request failures |
| Core3 API lifecycle | Invalid date, valid date, restart, concurrent submit, wrong token | `test-results.md` | pass in focused integration test |
| Odoo desktop, 1440x900 | Public certification token comparison | `odoo-browser-results.json`, `odoo-desktop.png` | HTTP 200 after redirect to login; no authenticated Survey fixture |
| Odoo mobile, 390x844 | Same reference comparison | `odoo-browser-results.json`, `odoo-mobile.png` | HTTP 200 after redirect to login; no authenticated Survey fixture |

No new API is left disconnected from a rendered route: the existing Surveys
public renderer consumes the question catalog returned by the `page.id: surveys`
API contract. Runtime and Odoo limitations prevent visual parity sign-off.
