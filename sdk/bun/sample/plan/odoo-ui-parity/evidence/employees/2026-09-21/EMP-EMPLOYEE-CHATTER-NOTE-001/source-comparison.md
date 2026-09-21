# Source comparison

| Odoo source | Core3 contract |
| --- | --- |
| `hr.employee` inherits `mail.thread.main.attachment` in `hr_employee.py` | `employee_messages` durable table in migration `20260922200000-074` |
| Employee form `<chatter reload_on_follower="True"/>` | Employee page `OdooFormView.message_source: employee_messages` |
| Odoo internal-note composer | API-owned `log_employee_note` `order_chatter` action with `employees.write` permission |
| Odoo record/company access boundary | Active employee/current-company guard plus actor, content, and row-version guards |

The page YAML contains presentation and action binding only. SQL, persistence,
content validation, and guards remain in the API/migration contracts.
