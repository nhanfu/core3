# Expenses parity batch 1

Status: implemented in the isolated `odoo-ui-expenses-impl` worktree.

This batch covers the reviewable list surface only:

- `/expenses` is the My Expenses list with deterministic individual-expense
  fixtures, status and paid-by filters, grouping, optional columns, selection,
  responsive kanban cards, receipt states, and draft/refused row actions.
- `/expenses/to-process` is the submitted/approved processing queue with the
  same shared ListView contracts, employee/company/category/status filters,
  grouping, optional columns, selection, and approve/refuse row actions.
- Datasources and actions live in `services/expenses/api/` fragments keyed by
  `page.id`; page YAML contains presentation only.
- Migration `20260910110000-002-expenses-ui-demo.yaml` seeds stable dates and
  stable IDs for draft, submitted, approved, posted, paid, and refused rows.

Known contract limitation: the current shared YAML schema does not expose the
planned `SearchPanel` component, so the processing queue uses its supported
filter contract until that generic primitive is added. Detail forms, receipt
upload, duplicate/split/post/refuse dialogs, categories, settings, analysis,
accounting integration, and Odoo reference captures are intentionally deferred.

Reference limitation: the live Odoo `hr_expense` addon is uninstalled and has no
loaded demo data. The implementation uses the ready source contract and Core3
fixtures; no unavailable Odoo screenshots are claimed.
