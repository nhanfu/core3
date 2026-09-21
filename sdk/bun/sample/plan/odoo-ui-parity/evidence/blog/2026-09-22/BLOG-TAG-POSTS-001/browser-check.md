# Browser check and blockers

BrowserSkill session `bvys` used instance `245ea108`; no credentials, cookies,
tokens, or other secrets were extracted. The session is stopped at handoff.

Odoo authenticated `/odoo` launcher showed Discuss, Calendar, Contacts, CRM,
Sales, Dashboards, Point of Sale, Invoicing, Project, Timesheets, Events,
Surveys, Purchase, Inventory, Maintenance, Employees, Expenses, and Apps, but
no Website or Blog. Desktop `/blog` returned Error 404; iphone-14 emulation of
the same route returned Error 404. The captures in this folder document the
blocker and are not Blog visual-parity evidence.

Core3 route verification was attempted against the single-module runtime on
`localhost:4311`. That listener served an unrelated MovedX/TMS sign-in page,
not the Core3 YAML application, and did not provide the existing Core3 QA
login session or Blog route. After stopping that probe, `localhost:3001` and
`localhost:4311` both refused connections. No Core3 screenshot or paired
visual-parity claim was made.
