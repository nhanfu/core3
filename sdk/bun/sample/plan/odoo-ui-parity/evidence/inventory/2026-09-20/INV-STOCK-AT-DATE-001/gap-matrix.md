# Gap matrix

| Gap before slice | Closure evidence | Disposition |
| --- | --- | --- |
| Stock report Inventory at Date action only returned a message | API server form inserts a report context and refreshes both context/report sources | Closed |
| Selected date did not affect report rows | Stock datasource applies latest company-scoped report date; 1/14 yields empty and 1/16 restores 10 rows | Closed |
| Date context had no durable seed or restart proof | Migration `0.0.23`, idempotence test, and file-backed reopen assertion | Closed |
| Report date/company boundaries were not exercised | Invalid date 422, wrong company 403, unauthorized page 403 | Closed |
| Odoo mobile date control parity | Odoo report renders at 390px but does not expose the date control in that responsive surface | Exact Odoo responsive boundary; no sign-off claimed |
| Full Inventory parity | Broader actors, attachments, workflows, and remaining Odoo visual gates remain open | Remains open |
