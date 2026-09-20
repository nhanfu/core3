# Functionality evidence

- Assignment CRUD: Product Detail `ecommerce.write` create/remove actions
  persist ordered source/accessory rows.
- Visibility: Cart recommendations require an open cart source line, active
  relation/source/target, published target, same-company source/target, and no
  existing cart line.
- Cart workflow: Add to Cart derives the owned open cart, validates the
  recommendation and company, inserts the deterministic line, increments the
  cart version, and repeats by incrementing the existing line quantity.
- Boundaries: wrong-company source, unpublished target, duplicate assignment,
  foreign/non-open cart, and stale relation removal are rejected without
  changing the protected rows.
- Durability: migration replay is safe and assignments survive DuckDB close /
  reopen.

No module sign-off is claimed. External payment/delivery and broader
authenticated actor/browser coverage remain outside this bounded slice.
