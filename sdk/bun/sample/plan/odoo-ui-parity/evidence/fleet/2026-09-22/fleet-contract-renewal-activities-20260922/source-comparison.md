# Source comparison

| Odoo source contract | Core3 implementation | Result |
| --- | --- | --- |
| Contract inherits mail activity behavior | `fleet_contract_activities` stream is bound to `contract-detail` and rendered by shared Odoo chatter | Supported in bounded slice |
| `Contract to Renew` activity type | Fixed `activity_type` and seeded renewal record | Supported |
| Renewal scheduling from contract deadline | Schedule action derives `due_date` from contract expiration | Supported in bounded slice |
| Activity completion state | Planned → Done with actor, timestamp, row version, and repeat guard | Supported |
| Company and permission boundary | `fleet.read` stream; `fleet.write` mutations; current-company and actor guards | Supported at API contract level |
| Durable restart and idempotent seed | File-backed DuckDB close/reopen and migration replay test | Supported |
| Live Odoo activity/chatter rendering | Authenticated reference has no Fleet menu | Blocked, not claimed |
| Core3 authenticated desktop/mobile workflow | QA sign-in was not completed | Blocked, not claimed |
