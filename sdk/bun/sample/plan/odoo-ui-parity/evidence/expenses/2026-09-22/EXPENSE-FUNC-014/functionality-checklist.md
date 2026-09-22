# EXPENSE-FUNC-014 functionality checklist

- [x] Page/API separation is joined by `page.id: expenses-employee`.
- [x] Odoo action title/path and list/kanban/form/pivot/graph order are
  represented.
- [x] Default approved/to-pay scope is deterministic and query-backed.
- [x] Status and payment-mode filters, employee/category/status/date grouping,
  and text search are represented.
- [x] Pivot exposes employee/date rows and total/tax measures; graph exposes
  employee/total dimensions through shared primitives.
- [x] Row navigation remains permissioned and opens the existing expense detail
  form surface.
- [x] Empty search and transport error states are explicit.
- [x] Stable ordering and seeded data are asserted.
- [x] Unauthenticated/permission behavior is inherited from the page and
  datasource `expenses.read` boundary; direct API contract is inspected.
- [ ] Authenticated Odoo/Core3 desktop comparison: blocked by tab borrow.
- [ ] Authenticated Odoo/Core3 mobile comparison: blocked by tab borrow.
