# Gap matrix

| Stable ID | Odoo gap | Core3 change | Evidence |
| --- | --- | --- | --- |
| `TIMEOFF-DASHBOARD-CALENDAR-001` | Personal year calendar action was listed in the plan but had no dedicated Core3 action/page. | Added `My Calendar`, page/API route alias, personal/year datasource, drilldown, and guarded empty/503 states. | Focused test and regression pass; Odoo browser gate blocked before navigation. |
