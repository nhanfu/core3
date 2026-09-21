# Browser evidence and blockers

Browser skill was used through a fresh session on shared browser instance
`245ea108`; the session was stopped cleanly after capture. No credentials,
cookies, tokens, or passwords were accessed or recorded.

## Odoo reference

Authenticated desktop and mobile launcher captures show no Website application:

- `/tmp/core3-odoo-parity/website-analytics-odoo-no-website-desktop.png`
- `/tmp/core3-odoo-parity/website-analytics-odoo-no-website-mobile.png`

The app launcher exposed Discuss, Calendar, To-do, Contacts, CRM, Sales,
Dashboards, Point of Sale, Invoicing, Project, Timesheets, Events, Surveys,
Purchase, Inventory, Maintenance, Employees, and Expenses. Direct navigation to
`/odoo/website-analytics` returned to Discuss. These are blocker diagnostics,
not Odoo Website reference captures.

## Core3

Core3 memory-mode startup reached the Vite frontend, but the backend exited
during whole-app page discovery with this unrelated existing error:

```text
PageSchemaError: Invalid page definition:
- components[0].source references unknown datasource "crm_lead_mining_request_detail"
- components[0].header_actions[0].id references unknown action "back_to_crm_lead_mining_requests"
- components[0].header_actions[1].id references unknown action "edit_crm_lead_mining_request"
- components[0].header_actions[2].id references unknown action "submit_crm_lead_mining_request"
- components[0].header_actions[3].id references unknown action "retry_crm_lead_mining_request"
```

The frontend therefore returned HTTP 502 for `/website-analysis`.

- `/tmp/core3-odoo-parity/website-analytics-core3-blocked-desktop.png`
- `/tmp/core3-odoo-parity/website-analytics-core3-blocked-mobile.png`

No authenticated Core3 Analytics visual claim is made. The blocker is outside
Website scope and was not modified.
