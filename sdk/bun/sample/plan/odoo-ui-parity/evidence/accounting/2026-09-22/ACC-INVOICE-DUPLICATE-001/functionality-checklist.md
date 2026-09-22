# Functionality checklist

| Stable case | Result |
| --- | --- |
| Page/API `page.id` is `invoice-detail` | Passed |
| OdooFormView Actions menu exposes Duplicate | Passed by contract; Odoo desktop observed |
| Duplicate requires `accounting.write` | Passed by contract/test |
| Duplicate requires a signed-in actor | Passed |
| Duplicate requires the current invoice row version | Passed |
| Duplicate creates a deterministic new draft row | Passed |
| Number/date/due date/reference/source links reset for the new draft | Passed |
| Payment/review/lock/PDF state resets and amount due is restored | Passed |
| Origin chatter records actor and source invoice | Passed |
| Missing/stale requests are rejected without partial writes | Passed |
| Duplicate survives DuckDB close/reopen and migration replay | Passed |
| Odoo line-copy and sequence engine behavior | Deferred explicitly |
| Authenticated Core3 desktop/mobile visual comparison | Blocked before runner startup |
