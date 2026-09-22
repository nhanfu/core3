# Gap matrix

| Stable-ID requirement | Result |
| --- | --- |
| Odoo Create Employee source trace | Pass: source assertion and source-comparison record |
| YAML page/API separation | Pass: applicant detail page and API both use `applicant-detail` |
| Durable applicant-to-employee link | Pass: migration, Employees row, reload and restart assertions |
| Permission/actor/company guard | Pass: `employees.write`, actor and wrong-company assertions |
| Hired/not-ready/stale/duplicate guards | Pass: focused mutation assertions |
| Desktop 1440x900 Odoo comparison | Blocked: authenticated tab owned by another BrowserSkill session |
| Mobile 390x844 Odoo comparison | Blocked: authenticated tab owned by another BrowserSkill session |
| Full Recruitment acceptance gate | Open: module remains `qa-in-progress` |
