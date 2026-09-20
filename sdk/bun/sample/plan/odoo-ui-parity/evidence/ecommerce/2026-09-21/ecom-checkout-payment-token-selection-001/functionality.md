# Functional evidence

- Migration 065 replays cleanly and adds the durable transaction token link and
  index without changing existing transaction fixtures.
- The checkout token datasource returns the deterministic masked Demo Gateway
  card only for the matching open customer cart and company.
- A missing token and a token belonging to another customer are rejected with
  `ECOMMERCE_CHECKOUT_PAYMENT_TOKEN_INVALID`; the cart remains open and no
  order is created.
- A valid Card checkout stores the selected token ID on the pending payment
  transaction, uses `offline_token`, creates one Sales handoff, and rejects a
  replay after cart conversion.
- Closing and reopening DuckDB preserves the order and token-linked pending
  transaction.

The focused proof is service/API and persistence evidence. It does not claim a
live provider charge, rendered checkout capture, or full module sign-off.
