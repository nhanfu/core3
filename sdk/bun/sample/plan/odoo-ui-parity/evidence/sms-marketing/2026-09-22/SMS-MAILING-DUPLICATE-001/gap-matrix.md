# Gap matrix

| Odoo behavior | Before | Change | Evidence |
| --- | --- | --- | --- |
| Duplicate visible on completed SMS mailing | Missing from SMS detail | Added conditional YAML header action | focused test |
| Durable duplicate Draft | No SMS duplicate mutation | Added explicit insert with reset state/counters | focused test |
| Active source guard | No persisted active field | Added idempotent migration and index | migration replay test |
| Odoo form comparison | `mass_mailing_sms` unavailable in reference DB | Captured installation blocker only | BrowserSkill verification |
