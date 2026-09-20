# Source comparison

| Odoo source | Core3 implementation |
| --- | --- |
| addons/hr/models/hr_employee.py: bank_account_ids, salary_distribution | services/employees/migrations/20260920230000-034-employee-bank-accounts.yaml and employee-detail.yaml datasource |
| addons/hr/wizard/hr_bank_account_wizard.py: allocation lines, percentage/fixed amount, trusted, Save validation | add_employee_bank_account, edit_employee_bank_account, and delete_employee_bank_account guarded line-item actions |
| addons/hr/wizard/hr_bank_account_allocation_wizard.xml: Bank Account Allocation modal | Personal notebook LineItemGrid page binding with add/edit/delete actions |

Core3 preserves durable row versions, authenticated actor checks, company scope,
active-employee checks, duplicate protection, and allocation ceilings.
