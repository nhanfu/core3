# EXPENSE-FUNC-017 functionality checklist

- [x] Page/API separation remains joined by `page.id: expenses-to-approve`.
- [x] Odoo `list,kanban,form,pivot,graph` order is represented exactly.
- [x] Form mode binds to the existing durable expense detail page.
- [x] Row open and double-click both use the permissioned detail action.
- [x] Department default scope, submitted-only ordering, receipt guard,
  reasoned refusal, empty state, and transport error remain unchanged.
- [x] No migration or page-local datasource was introduced.
- [x] Focused department approval test passes.
- [ ] Authenticated Odoo desktop comparison: blocked by tab ownership.
- [ ] Authenticated Odoo mobile comparison: blocked by tab ownership.
