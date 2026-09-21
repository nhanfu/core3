# Functionality checklist

| Case | Expected result | Result |
| --- | --- | --- |
| F-011-01 | Detail API and page join through `page.id: expense-detail`; no page-local datasource/action | pass |
| F-011-02 | Seeded planned activity is readable in expense chatter | pass |
| F-011-03 | Authorized actor schedules supported activity with summary/deadline/assignee and parent version increment | pass |
| F-011-04 | Invalid type, blank summary, invalid ISO date, anonymous actor, wrong company, and stale parent are rejected without partial writes | pass |
| F-011-05 | Authorized actor marks planned activity done with optimistic row-version guard and completion audit | pass |
| F-011-06 | Missing, wrong-company, already-done, and stale completion are rejected | pass |
| F-011-07 | Scheduled and completed rows survive close/reopen and migration replay | pass |
| F-011-08 | Odoo authenticated desktop/mobile activity surface captured | pass; Odoo pair |
| F-011-09 | Core3 authenticated desktop/mobile activity interaction | conditional; exact result in `verification.md` |
