# Browser check and blocker

BrowserSkill was used on browser instance `245ea108` with the authenticated
local Odoo session and database `core3_reference`. Credentials, cookies, and
tokens were not extracted or recorded. The owned BrowserSkill session was
stopped after both captures.

The launcher did not contain Recruitment. It exposed Discuss, Calendar, To-do,
Contacts, CRM, Sales, Dashboards, Point of Sale, Invoicing, Project, Timesheets,
Events, Surveys, Purchase, Inventory, Maintenance, Employees, and Expenses.
Navigating to `http://localhost:8069/odoo/recruitment?db=core3_reference`
returned the Discuss shell at the requested desktop viewport and an Odoo shell
with only the mobile menu controls at the requested mobile emulation. The
Recruitment Plans action, records, and Odoo feature views were therefore
unavailable for comparison. This is an environment blocker, not a claim that
the local Odoo source action is absent.

Blocker captures are outside Git:

| Requested state | Capture | PNG dimensions | SHA-256 |
| --- | --- | --- | --- |
| Desktop 1440x900 | `/tmp/core3-odoo-parity/recruitment-activity-plans-odoo-desktop-1440x900-20260922.png` | 1440x719 | `3e642bbecedb33c17bb616f78f4ecbc29b7adbebbd43e79d705229d5f71327c2` |
| Mobile emulation 390x844 | `/tmp/core3-odoo-parity/recruitment-activity-plans-odoo-mobile-390x844-20260922.png` | 1440x719 artifact; live observation 390x844 | `39413162dea2b5f2f5cf411a3fea89b781f3623d869892d5d94cc4e9df80bc6f` |

The mobile PNG was emitted at the Agent Window capture dimensions even though
the live tab observation was 390x844; it is retained as a blocker artifact and
is not claimed as a 390x844 feature screenshot. No authenticated Odoo feature
screenshot or paired visual-parity sign-off is claimed.
