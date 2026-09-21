# Functionality evidence

- The company policy defaults to `everyone` and exposes deterministic
  `everyone`/`logged_in` options.
- Policy reads require `ecommerce.read`; updates require `ecommerce.write` and
  an expected row version.
- Invalid modes, wrong-company edits, and stale writes are rejected before
  changing the durable policy.
- Logged-out public shop access is denied when the policy is `logged_in`;
  authenticated access remains available.
- Public cart, checkout, wishlist, and wishlist-item routes use the same
  access boundary; anonymous add-to-cart has a matching YAML guard.
- Authenticated anonymous-add retries remain idempotent at the existing cart
  line identity boundary.
- Migration replay and database reopen retain the changed policy.
