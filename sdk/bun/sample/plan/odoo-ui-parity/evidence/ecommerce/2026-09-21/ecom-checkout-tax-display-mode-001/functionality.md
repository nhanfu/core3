# Functionality evidence

- Migration replay twice creates the durable policy and does not duplicate its
  unique company row.
- The deterministic My Company fixture starts as `tax_excluded` and projects
  `Line subtotals exclude tax` through the policy, cart, checkout, and public
  cart contracts.
- A valid update changes the row to `tax_included`, increments `row_version`,
  and changes the cart projection to `Line subtotals include tax`.
- Wrong-company scope and unsupported mode requests are rejected with the
  explicit 409/422 policy errors; a stale row version is rejected without a
  second update.
- A file-backed DuckDB restart preserves the selected mode and row version.
