# Functional lifecycle

- Deterministic `My Company` starts at `stay`, with `/ecommerce/shop` intent.
- Policy update to `go_to_cart` returns `/ecommerce/cart` and increments
  `row_version`.
- Wrong-company writes return `409 ECOMMERCE_ADD_TO_CART_POLICY_STALE`.
- Unsupported mode returns `422 ECOMMERCE_ADD_TO_CART_POLICY_INVALID`.
- Stale writes return the same conflict without changing the policy.
- Authenticated add-to-cart persists a customer cart line and returns
  `go_to_cart` plus `/ecommerce/cart`.
- Anonymous add-to-cart persists a public cart line and returns the same intent.
- Switching back to `stay` returns `/ecommerce/shop`; the line quantity remains
  durable and increments idempotently on the next add.
- Migration replay and DuckDB close/reopen preserve `go_to_cart` and version 2.
