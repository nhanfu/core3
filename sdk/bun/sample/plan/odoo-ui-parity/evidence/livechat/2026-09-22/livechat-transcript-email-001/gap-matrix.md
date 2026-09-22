# Gap matrix

| Gap | Odoo contract | Core3 implementation | Evidence |
| --- | --- | --- | --- |
| Route/action | `/im_livechat/email_livechat_transcript`, authenticated JSON-RPC | `email_livechat_session_transcript` with the exact route string and `livechat.write` | TE-001 |
| Closed-session UI | Transcript sender appears for closed conversations | Session-detail header action has `record.status === 'Closed'`; active sessions are hidden | TE-002, TE-004 |
| Recipient validation | Valid email required before RPC | Required email field plus SQL regex guard | TE-003 |
| Durable result | Odoo mail stack sends a transcript | `livechat_transcript_deliveries` stores `Queued`, recipient, actor, time; no external send claim | TE-006, TE-007 |
| Security/concurrency | Internal authenticated user and accessible channel | Live Chat permission, actor, assigned-operator, missing, closed, and row-version guards | TE-005 |
| Live reference | Odoo UI/source action should be inspected at desktop/mobile | Authenticated tab was already borrowed by another BrowserSkill session; no captures | TE-008 |
