# Gap matrix

| Odoo behavior | Previous Core3 | Change | Evidence |
| --- | --- | --- | --- |
| `action_hr_job_interviewer` Job Positions action | Missing | `/openings/interviewer` page and navigation action | source/page/API test |
| `kanban,form`, no create | Ordinary list/kanban had create | Kanban-only ListView contract with no create action and read-only detail | page contract test |
| Interviewer assignment domain | No assignment relation | `recruitment_opening_interviewers` durable table and actor filter | migration/scope test |
| Company and direct-record guard | Ordinary openings used company scope only | Assignment plus company predicates on list/detail datasource | scope test |
| Odoo live desktop/mobile evidence | Not available | attempted required BrowserSkill borrow and recorded blocker | browser-check.md |
