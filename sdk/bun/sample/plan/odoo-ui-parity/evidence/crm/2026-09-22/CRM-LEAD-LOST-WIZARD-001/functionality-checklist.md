# Functionality checklist

| Case | Result |
| --- | --- |
| Page/API separation and `page.id: lead-detail` binding | Pass |
| Exact Lost Lead modal labels and optional note field | Pass |
| Active reason converts open lead to Lost and sets probability to 0 | Pass |
| Closing note appears in the CRM timeline/audit table | Pass |
| Empty note does not create a note row | Covered by optional field contract; no note-write path for blank input |
| Inactive reason rejected before writes | Pass |
| Stale row rejected before writes | Pass |
| Already closed lead rejected before writes | Pass |
| File-backed restart retains state and note | Pass |
| Full multi-record Odoo wizard parity | Open, intentionally outside bounded slice |
| Authenticated Odoo/Core3 desktop/mobile visual evidence | Blocked; no captures |
