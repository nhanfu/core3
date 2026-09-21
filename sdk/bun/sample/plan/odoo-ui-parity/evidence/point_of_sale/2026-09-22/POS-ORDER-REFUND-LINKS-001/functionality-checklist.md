# Functionality checklist

Feature ID: `POS-ORDER-REFUND-LINKS-001`

- [x] `REFUND-LINKS-CONTRACT`: page/API fragments use matching
  `page.id` values; actions retain `pos.read` and route through the existing
  order detail surface.
- [x] `REFUND-LINKS-SOURCE`: order detail projects refund count and reverse
  relationship from service-owned `pos_orders` data.
- [x] `REFUND-LINKS-LIST`: Refund Orders is a real filtered datasource scoped
  by source order and current company, with search, status filter, row
  navigation, empty, forbidden, unauthorized, and transport declarations.
- [x] `REFUND-LINKS-NAV`: source order opens the filtered list; refund order
  opens its original order; unknown and cross-company IDs do not leak rows.
- [x] `REFUND-LINKS-DURABILITY`: deterministic relationship fixtures survive
  migration replay, close/reopen, and do not duplicate.
- [x] `REFUND-LINKS-PERMISSION`: `pos.read` is required for both relationship
  actions and the list; a manager/cashier write permission is not needed.
- [ ] `REFUND-LINKS-RESPONSIVE`: authenticated desktop 1440x900 and mobile
  390x844 list/detail states fit the viewport without horizontal overflow.
- [x] `REFUND-LINKS-REGRESSION`: existing Return Products, Delete, Pickings,
  Orders, and order-detail contracts remain unchanged except for the intended
  refund relationship projection.
