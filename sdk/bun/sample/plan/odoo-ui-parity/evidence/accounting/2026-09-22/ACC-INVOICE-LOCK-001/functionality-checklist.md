# Functionality checklist

| Stable case | Result |
| --- | --- |
| Page/API `page.id` is `invoice-detail` | Passed |
| Posted unlocked document shows permissioned Lock action | Passed by contract/test |
| Lock requires an Accounting write permission | Passed by contract/test |
| Lock requires a non-empty signed-in actor | Passed |
| Lock requires current row version | Passed |
| Lock increments row version and persists actor/time/state | Passed |
| Lock writes secured-entry chatter event | Passed |
| Missing, already locked, non-posted, and stale requests are rejected | Passed |
| Reset to Draft is rejected after locking | Passed |
| Lock survives DuckDB close/reopen and migration replay | Passed |
| Odoo cryptographic hash-chain and bulk chain behavior | Deferred explicitly |
| Authenticated Core3 desktop/mobile visual comparison | Blocked before runner startup |
