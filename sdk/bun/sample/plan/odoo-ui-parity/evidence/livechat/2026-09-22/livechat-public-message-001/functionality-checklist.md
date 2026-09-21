# Functionality checklist

| Case | Class | Acceptance |
| --- | --- | --- |
| PM-001 | contract | Visitor page/API retain `page.id: livechat-visitor-session`; API exposes the public message action and the exact Odoo CORS route. |
| PM-002 | UI | Existing token-scoped visitor conversation renders a `Send message` composer with `Say something...` placeholder and refreshes its timeline after send. |
| PM-003 | security | A valid visitor token can post only to its own session; a wrong token returns 404 and does not insert a row. |
| PM-004 | validation | Blank/whitespace and over-4000-character messages return deterministic 422 errors without changing message count or row version. |
| PM-005 | workflow | Active/Waiting for Customer/Looking for Help sessions accept a visitor message; Closed sessions reject it with a state error. |
| PM-006 | data | The message is durable, visitor-authored, ordered in the transcript, increments `message_count`, and increments the session row version atomically. |
| PM-007 | restart | A file-backed DuckDB restart retains the sent visitor message and its session projection. |
| PM-008 | regression | Existing feedback, leave, widget bootstrap/resume, operator message, and tag assignment tests remain green. |
| PM-009 | browser | Attempt authenticated Odoo/Core3 desktop 1440x900 and mobile 390x844 checks; record exact runtime/reference blockers and do not claim visual parity without captures. |
