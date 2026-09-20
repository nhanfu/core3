# Functional evidence

- Migration replay leaves one deterministic customer wishlist and one Mug item.
- Customer add creates an item; repeating the same product/variant returns the
  existing item and does not create a duplicate row.
- Wrong-company creation is rejected before persistence; hidden/unpublished
  products and invalid variants are rejected.
- Customer ownership filtering prevents another customer from reading or
  removing an item; the current row version is required for removal.
- Anonymous POST creates a cookie-scoped wishlist, GET returns the durable
  items, and DELETE calls the guarded public remove action.
- A custom Lamp item survives DuckDB close/reopen with product, price, and row
  version intact.

The focused test is bounded service/API evidence. It does not claim login
session merge, live rendered browser parity, or full module sign-off.
