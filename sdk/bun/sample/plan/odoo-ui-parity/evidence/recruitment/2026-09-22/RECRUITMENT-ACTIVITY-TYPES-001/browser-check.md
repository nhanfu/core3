# Browser check and blocker

BrowserSkill was used on browser instance `245ea108` with the authenticated
local Odoo session and database `core3_reference`. Credentials, cookies, and
tokens were not extracted or recorded.

The launcher did not contain Recruitment. It exposed Discuss, Calendar, To-do,
Contacts, CRM, Sales, Dashboards, Point of Sale, Invoicing, Project, Timesheets,
Events, Surveys, Purchase, Inventory, Maintenance, Employees, and Expenses.
Navigating to `http://localhost:8069/odoo/recruitment?db=core3_reference`
returned the Discuss shell. Therefore the Activity Types action, records, and
Odoo desktop/mobile views were unavailable for capture. This is an environment
blocker, not a claim that the Odoo source action is absent.

Exact blocker captures (outside Git):

| Viewport | Capture | SHA-256 |
| --- | --- | --- |
| 1440x900 | `/tmp/core3-odoo-parity/recruitment-activity-types-20260922/odoo-reference-desktop-blocker.png` | `db9e6a6dada9f3f4b0a4b412f6601f7080c7cf1725967ed23f4bb43e39abc3d5` |
| 390x844 | `/tmp/core3-odoo-parity/recruitment-activity-types-20260922/odoo-reference-mobile-blocker.png` | `e8f1d213fd00d860a068f7e208323ac285f9f355cbd7ca5349b47aa7e91b2621` |

No authenticated Odoo feature screenshot or paired visual-parity sign-off is
claimed. The isolated Core3 runtime separately stopped during YAML startup on
the unrelated duplicate named action `time_off.requests.refuse`; no
authenticated Core3 screenshot is claimed. The BrowserSkill session was
stopped after the capture attempt.
