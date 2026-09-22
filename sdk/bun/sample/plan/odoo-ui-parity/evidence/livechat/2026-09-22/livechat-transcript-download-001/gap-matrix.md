# Gap matrix

| Stable gap | Existing state | Bounded change | Evidence |
| --- | --- | --- | --- |
| Public visitor transcript download | Missing; transcript email was authenticated-only | Add token-scoped artifact datasource, client PDF action, and closed-session visibility guard | focused integration test |
| Durable transcript bytes | No Live Chat artifact relation | Add idempotent `livechat_transcript_downloads` migration and fixed PDF fixtures | restart test |
| Wrong-token/open/missing guards | No download contract | Return no datasource row and no browser download | ownership test |
| Live Odoo comparison | Borrowed-tab confirmation unavailable | Record blocker; do not claim visual parity | verification.md |
