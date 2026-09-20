# Functional evidence

- Migration 064 is replay-safe and seeds an anonymous session with a duplicate
  Mug and a unique Lamp.
- Wrong-company calls fail with the declared company-scope error before any
  row changes; stale session versions fail with the declared 409 boundary.
- A valid merge keeps one customer Mug, transfers the unique Lamp, increments
  the customer wishlist once, and deletes the anonymous session and its items.
- A replay after session consumption returns the same two-item customer
  wishlist without duplicating rows or incrementing its version again.
- Closing and reopening DuckDB preserves the merged customer owner/items and
  the consumed session state.

The focused proof is service/API and persistence evidence. It does not claim
the shared auth event is wired or that a rendered login flow passed.
