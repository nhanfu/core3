# Gap matrix

| Requirement | Result |
| --- | --- |
| Source action and wizard traced | Pass: focused source assertions and source comparison |
| YAML page/API separation | Pass: applicants and applicant-detail fragments join their page IDs |
| List/kanban and detail entry points | Pass: bulk action plus guarded detail header action |
| Durable normal-applicant pool profile | Pass: migration, source link, memberships, and restart assertion |
| Existing pool applicant behavior | Pass: additional membership without duplicate clone |
| Optional tags and idempotent replay | Pass: relation persistence and duplicate-safe inserts |
| Permission/actor/company/state guards | Pass: `recruitment.write` plus focused mutation assertions |
| Desktop/mobile Odoo comparison | Blocked: authenticated user tab was owned by another BrowserSkill session; alternate borrow timed out |
| Full Recruitment acceptance gate | Open: module remains `qa-in-progress` |
