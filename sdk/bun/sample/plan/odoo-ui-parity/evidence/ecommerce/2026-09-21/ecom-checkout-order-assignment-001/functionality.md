# Functionality evidence

- The policy datasource is company-scoped and read-protected by
  `ecommerce.read`.
- The Save Assignment action requires `ecommerce.write` and optimistic
  `row_version` concurrency.
- Active team and salesperson options are company-scoped; inactive, foreign,
  and unknown values are rejected without changing the policy.
- A confirmed authenticated checkout stores team/person IDs and names on the
  order; guest checkout uses the same policy and stores the same snapshot.
- The Sales handoff row copies the order assignment once through its existing
  unique order idempotency boundary.
- Retrying a converted cart is rejected by the checkout closed-cart guard.
- Migration replay and database reopen retain the changed policy.
