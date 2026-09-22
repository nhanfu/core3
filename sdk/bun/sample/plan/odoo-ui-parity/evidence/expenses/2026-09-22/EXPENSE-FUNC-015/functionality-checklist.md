# EXPENSE-FUNC-015 functionality checklist

- [x] Expense detail page remains layout-only and binds the new datasource by
  `page.id: expense-detail`.
- [x] Employee-paid and company-paid fixtures have stable typed targets and
  destination routes.
- [x] Journal Entry and Payment smart buttons use `accounting.read` and open
  the existing Accounting detail destinations.
- [x] Link reads enforce the current-company boundary.
- [x] Missing/empty and transport-error datasource states are explicit.
- [x] Migration seed and replay preserve exactly one link per seeded expense.
- [x] No Accounting service files or unrelated module files were changed by
  this feature.
- [ ] Authenticated Odoo/Core3 desktop comparison: blocked by tab ownership.
- [ ] Authenticated Odoo/Core3 mobile comparison: blocked by tab ownership.
