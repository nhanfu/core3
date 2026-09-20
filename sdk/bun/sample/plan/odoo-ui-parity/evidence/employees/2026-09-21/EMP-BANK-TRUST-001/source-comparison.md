# EMP-BANK-TRUST-001 source comparison

| Surface | Odoo source | Core3 bounded implementation |
| --- | --- | --- |
| Employee action | `addons/hr/models/hr_employee.py` defines `action_toggle_primary_bank_account_trust`; it flips `primary_bank_account_id.allow_out_payment`. | `api/employee-detail.yaml` adds `toggle_employee_bank_account_trust` for an employee bank-account row and flips durable `employee_bank_accounts.trusted`. |
| Form binding | `addons/hr/views/hr_employee_views.xml` renders Trust/Untrust buttons beside the primary bank account in the Personal tab. | `pages/employee-detail.yaml` adds a `LineItemActions` row action labelled `Toggle trust` beside Edit/Delete. |
| Persistence | Odoo stores the payout trust flag on the bank account partner relation. | Existing migration `20260920230000-034-employee-bank-accounts.yaml` provides the durable `trusted` column and deterministic primary/secondary fixtures; no duplicate migration row was introduced. |
| Security and scope | The employee form is HR-user scoped and the object action operates on the selected employee's primary account. | The action requires `employees.write`, a non-empty actor, an active employee in `current_company_name`, the employee row version, and the bank-account row version. Both updates are guarded and atomic. |
| Reference boundary | The authenticated reference employee has no bank-account rows, so Odoo exposes no populated trust row to toggle. | Core3 deterministic rows are in `Core3 Vietnam`; the isolated browser session could not authenticate because an existing shared Employees API fragment fails discovery with `PageSchemaError: actions[4].fields is not allowed`. |
