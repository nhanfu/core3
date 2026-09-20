# QA inventory

| Surface | Probe | Evidence | Result |
| --- | --- | --- | --- |
| Public submit API | Correct answers | Focused integration test | 100%, passed |
| Public submit API | Wrong answers and token misuse | Focused integration test | 0%/failed, wrong token 404, passed |
| Persistence | File-backed reopen | Focused integration test | score/pass preserved, passed |
| Concurrency | Two same-key submit requests | Focused integration test | one durable row and replay, passed |
| Core3 authenticated desktop, 1440x900 | Admin login, `/api/auth/me`, public API/page | `core3-browser-results.json`, desktop PNG | login 200; API 404, page 401 blocker |
| Core3 authenticated mobile, 390x844 | Same route and overflow check | `core3-browser-results.json`, mobile PNG | login 200; API 404, page 401 blocker |
| Odoo desktop, 1440x900 | Public token comparison | `odoo-browser-results.json`, desktop PNG | redirected to login |
| Odoo mobile, 390x844 | Public token comparison | `odoo-browser-results.json`, mobile PNG | redirected to login |
