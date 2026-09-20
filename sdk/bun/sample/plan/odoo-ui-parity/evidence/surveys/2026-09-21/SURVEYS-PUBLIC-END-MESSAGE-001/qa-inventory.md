# QA inventory

| Surface | Probe | Evidence | Result |
| --- | --- | --- | --- |
| Public submit | Completed response | Focused integration test | configured message returned |
| Public resume | Submitted token after reopen | Focused integration test | message remains durable |
| Concurrency | Two same-key submits | Focused integration test | one row, replay-safe |
| Wrong token | Submit with unrelated token | Focused integration test | 404, no mutation |
| Core3 authenticated desktop, 1440x900 | Admin login, `/api/auth/me`, public API/page | `core3-browser-results.json`, desktop PNG | login 200; API 404, page 401 blocker |
| Core3 authenticated mobile, 390x844 | Same route and overflow check | `core3-browser-results.json`, mobile PNG | login 200; API 404, page 401 blocker |
| Odoo desktop, 1440x900 | Public token comparison | `odoo-browser-results.json`, desktop PNG | redirected to login |
| Odoo mobile, 390x844 | Public token comparison | `odoo-browser-results.json`, mobile PNG | redirected to login |
