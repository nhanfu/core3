# Gap matrix

| Gap | Required behavior | Implementation/evidence | Status |
| --- | --- | --- | --- |
| Missing configuration menu | Ordered SMS Configuration entry | Manifest group and source-mapped route test | closed |
| Missing durable blacklist | Persist numbers and active state across reload/restart | Schema/data migrations and replay test | closed |
| Missing list/form parity | Search, Archived filter, list/form tabs, empty copy | Page/API YAML and contract test | closed |
| Missing state workflow | Blacklist ↔ Unblacklist with stale/state guards | Manager actions and mutation assertions | closed |
| Missing input safety | Normalize and reject invalid/duplicate numbers | SQL guards and normalization assertions | closed |
| Missing Odoo screen comparison | Authenticated desktop/mobile reference capture | Addon not installed in `core3_reference` | blocked |
| Chatter history | Thread notes on blacklist changes | Odoo `mail.thread` behavior | deferred |
