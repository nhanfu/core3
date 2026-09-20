# Verification

The feature test maps the installed Odoo wizard, queries eligible options,
applies the template to the employee and current version, rejects cross-
company, inactive, stale, and ineligible writes atomically, and confirms the
values after a file-backed restart. The full Employees corpus is green.

Authenticated Odoo captures show the source Payroll action and modal at
1440x900 and 390x844. Authenticated Core3 captures show a clean responsive
Employees shell at the same viewports but cannot reach a detail record because
the current company (`Core3 Vietnam Branch`) does not match seeded Employees
data (`Core3 Vietnam`). The blocker is retained in `core3-blocker.json`; no
Core3 UI pass or aggregate module sign-off is claimed.
