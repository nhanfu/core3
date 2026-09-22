# EXPENSE-FUNC-016 functionality checklist

- [x] Expense detail page remains layout-only and joins the split API through
  `page.id: expense-detail`.
- [x] Split wizard and line grid expose the Odoo tax fields and labels.
- [x] Split total and tax total are computed from durable line rows.
- [x] Product-cost visibility and mutation guards prevent unsupported splits.
- [x] Source tax amount and child expense tax amounts persist after splitting.
- [x] Existing receipt attachments are copied to generated child expenses.
- [x] Existing empty, transport-error, stale, invalid, and permission guards
  remain covered.
- [x] Migration/schema scope is unchanged because existing durable tables are
  sufficient.
- [ ] Authenticated Odoo/Core3 desktop comparison: blocked by tab ownership.
- [ ] Authenticated Odoo/Core3 mobile comparison: blocked by tab ownership.
