# Source comparison

| Odoo source behavior | Core3 implementation |
| --- | --- |
| Payroll employee form exposes Load a Template to HR users | `pages/employee-detail.yaml` action gated by `employees.write` |
| Wizard selects an employee-company template | employee-scoped options datasource filters active company templates |
| Whitelisted fields fill the contract | atomic mutation copies job, department, type, wage, and schedule |
| Version links the selected template | employee and active contract version store template id/name |
| Invalid context does not write | active/company, row-version, and template eligibility guards |
| Data survives writes/restart | migration 030 plus focused file-backed restart test |

Core3 browser evidence is blocked by the existing authenticated company scope:
the session is `Core3 Vietnam Branch`, while deterministic Employees fixtures
are `Core3 Vietnam`. The guarded API correctly rejects a mismatched employee
create with HTTP 403.
