# Functional evidence

- Migration replay is idempotent and seeds one published five-star Mug review.
- Product Detail exposes the review list and the published count/average
  projection; pending and rejected rows do not affect the aggregate.
- A review can be created, edited, published, rejected, and deleted through
  paired API actions. Editing a published review returns it to moderation.
- Wrong-company products, ratings outside 1-5, invalid text lengths, and stale
  row versions are rejected without overwriting the review.
- Reopening DuckDB preserves review author, rating, content, state, and row
  version.
