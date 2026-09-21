# Functionality evidence

- An active channel with an operator bootstraps a durable widget session.
- Repeating the same channel/token request resumes the same widget and conversation ids without duplicating the welcome message.
- Channel availability, visitor token/name, durable-only mode, and closed session state are guarded before mutation with deterministic errors.
- The visitor token is required for both the widget session and its message projection; an unrelated token returns no conversation data.
- Migration replay is idempotent and the widget/session rows survive a file-backed DuckDB restart.

Focused executable evidence: `test/livechat_widget_session.integration.test.ts`.
