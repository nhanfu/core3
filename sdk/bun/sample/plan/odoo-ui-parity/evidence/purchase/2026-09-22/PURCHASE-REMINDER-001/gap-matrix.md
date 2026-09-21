# Gap matrix

| Gap | Required change | Status/evidence |
| --- | --- | --- |
| Reminder settings were absent from the order detail | Add idempotent columns, deterministic demo values, and datasource fields | Complete; migration and focused test |
| Reminder sample had no durable Core3 record | Add indexed `purchase_order_reminder_previews` and union it into order history | Complete; restart assertion |
| State and actor safety | Add enabled/state/row-version and valid-user-email guards | Complete; atomic rejection assertions |
| Exact Odoo composer/toaster and outbound delivery | Add shared mail delivery/composer parity | Follow-up; no claim |
| Authenticated Odoo/Core3 desktop/mobile proof | Borrow existing authenticated tab and capture both surfaces | Blocked: borrow confirmation remained pending |
