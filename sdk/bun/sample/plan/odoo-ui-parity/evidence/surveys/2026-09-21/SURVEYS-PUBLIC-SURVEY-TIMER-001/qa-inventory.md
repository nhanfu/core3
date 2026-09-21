# QA inventory

Feature: `SURVEYS-PUBLIC-SURVEY-TIMER-001`

| Surface | Evidence | Result |
| --- | --- | --- |
| Durable schema/demo | migration `0.0.41`, fixed survey/question IDs | pass |
| Page/API separation | `page.id: surveys` in `pages/surveys.yaml` and `api/surveys.yaml` | pass |
| Public permission/token guard | `surveys.public`; survey and answer token checks | pass |
| Expiry/no mutation | 410 timer code before GET/progress mutation | pass |
| Restart/idempotency | file-backed DuckDB close/reopen and token replay | pass |
| Core3 desktop/mobile | `core3-browser-results.json` | blocked: ports 3000/3001/3002 refused |
| Odoo desktop/mobile | `odoo-desktop.png`, `odoo-mobile.png` | blocked: route redirects to login; Surveys reference not available |

The module remains `qa-in-progress / conditional`; tests alone do not close
the paired visual/reference gate.
