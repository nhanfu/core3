# Functional evidence

- Deterministic `Visa •••• 4242` token fixture is present after migration replay.
- Registration rejects an unmasked value, disabled/non-tokenizable provider,
  wrong company, invalid customer, and non-tokenizable payment method.
- Repeating the same `idempotency_key` returns the original masked token and
  does not overwrite its details.
- Retirement requires the current row version and company; a stale or wrong
  scope cannot change the token.
- Authenticated customer scope returns only the current user's token rows.
- A registered token survives DuckDB close/reopen with its provider reference,
  active state, and row version intact.

The focused test is contract/service evidence, not a module sign-off. External
gateway token creation, checkout token selection, raw-secret handling, and
authenticated browser actor evidence remain separate gates.
