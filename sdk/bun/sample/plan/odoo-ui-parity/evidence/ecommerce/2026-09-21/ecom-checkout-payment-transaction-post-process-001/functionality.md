# Functional lifecycle

- Existing deterministic transaction starts unprocessed with a null timestamp.
- Wrong-company post-processing returns `409 ECOMMERCE_PAYMENT_TRANSACTION_STALE`.
- A valid post-process sets `is_post_processed = TRUE`, records a timestamp,
  increments `row_version`, and leaves payment state intact.
- Repeating the action returns
  `409 ECOMMERCE_PAYMENT_TRANSACTION_ALREADY_POST_PROCESSED`.
- A stale version returns `409 ECOMMERCE_PAYMENT_TRANSACTION_STALE` without
  changing the transaction.
- A later valid state transition clears the processed flag/timestamp, allowing
  the new state to be post-processed again.
- New checkout transactions initialize the durable fields explicitly.
- Migration replay and DuckDB close/reopen preserve processed state and version.
