# Source comparison

| Odoo source | Core3 contract |
| --- | --- |
| `hr.employee` defines `message_follower_ids` and `message_partner_ids` in `hr_employee.py` | `employee_followers` durable relation in migration `20260922210000-075` |
| Employee form `<chatter reload_on_follower="True"/>` | Employee page follower source/candidate source and shared follower manager binding |
| Odoo follower add/remove behavior | API-owned `add_employee_follower` and `remove_employee_follower` actions with audit events |
| Odoo employee/company access boundary | Active employee/current-company guard plus actor, enabled-user, duplicate/missing, and row-version guards |

The page YAML contains presentation and action binding only. SQL, relation
persistence, candidate filtering, audit events, and guards remain in API and
migration contracts.
