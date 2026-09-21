# Functionality evidence

- Feedback is token-scoped to one durable session and updates the existing
  feedback row rather than creating duplicates.
- Ratings outside 1–5 and reasons over 2000 characters are rejected before
  mutation.
- Cross-session tokens return `LIVECHAT_PUBLIC_SESSION_NOT_FOUND` without
  disclosing the target conversation.
- Leave transitions an open visitor session to `Closed` / `Visitor Left`,
  appends a durable `Visitor left` message, and rejects replay after closure.
- Migration replay is idempotent and the visitor token plus seeded feedback
  survive a file-backed DuckDB restart.

Focused executable evidence: `test/livechat_visitor_feedback.integration.test.ts`.
