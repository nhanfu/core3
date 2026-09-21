# Functionality evidence

- Migration replay twice creates the recovery policy, template fixture, and
  abandoned-cart recovery columns without duplicating rows.
- The My Company policy starts disabled with a 10-hour delay and the active
  `Ecommerce Cart Recovery` sale-order template.
- Sending while disabled is rejected; wrong-company policy writes, invalid
  delay, invalid template, and stale policy writes are rejected with explicit
  409/422 errors.
- Enabling recovery updates the policy version; sending an eligible abandoned
  cart increments its row version, sets `recovery_email_sent`, and records a
  deterministic send timestamp.
- A second send with the prior version is rejected, preserving one-shot
  idempotency.
- A file-backed DuckDB restart preserves both the enabled policy and sent
  ledger.
