# Functionality checklist

| Case | Class | Acceptance |
| --- | --- | --- |
| TE-001 | contract | The page/API join remains `livechat-session-detail`; the API action retains `/im_livechat/email_livechat_transcript`. |
| TE-002 | UI contract | Closed session detail exposes `Email transcript`; active sessions do not expose the header action. |
| TE-003 | validation | Valid email queues one request; malformed email returns 422 with no delivery row. |
| TE-004 | workflow | Open sessions cannot request a transcript; closed-session detail refreshes last recipient/time/count. |
| TE-005 | permission | Missing actor, wrong assigned operator, missing session, and stale row version are rejected before insert. |
| TE-006 | persistence | Delivery request and parent row-version increment are atomic and durable. |
| TE-007 | restart | File-backed DuckDB restart retains the seeded and newly queued delivery rows. |
| TE-008 | browser | Attempt authenticated Odoo desktop/mobile inspection; record the exact borrow blocker and make no visual-parity claim without captures. |
