# EMP-BANK-ALLOCATION-001 source comparison

| Surface | Odoo source | Core3 bounded implementation |
| --- | --- | --- |
| Open action | `hr.employee.action_open_allocation_wizard` creates `hr.bank.account.allocation.wizard` from the employee Personal tab. | Employee detail API/page binds `open_employee_bank_allocation` to `/employees/bank-allocations?id=...`. |
| Wizard lines | `allocation_ids` copies every employee bank account's amount, percentage/fixed type, sequence, and trust flag. | `employee_bank_allocation_lines` projects the durable bank rows; the page-only LineItemGrid binds guarded line editing. |
| Save | `action_save` writes `salary_distribution`, updates bank trust flags, and rejects percentage totals other than 100%. | `save_employee_bank_allocation` requires exact 100% when percentage lines exist, records a durable save run, and increments the employee row version atomically. |
| Security and scope | Employee form is HR-user scoped. | Read requires `employees.read`; line edit/save require `employees.write`, actor identity, active employee, current company, parent row version, and line row version. |
| Persistence | Odoo stores salary distribution and bank trust state on employee/bank records. | Existing bank-account migration `20260920230000-034` remains the deterministic line fixture; new migration `20260921110000-041` adds replay-safe allocation save history. |
