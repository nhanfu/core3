# Gap matrix

| Gap | Change | Boundary |
| --- | --- | --- |
| Core3 Journal Entries had no Odoo Review Entries action | Added page/API-matched row/detail action and source-backed contract test | one-row bounded action |
| Reviewed state was not durable | Added migration `20260922200000-054-accounting-journal-entry-reviewed.yaml` and datasource field | boolean state only; no reviewer/timestamp |
| Repeated/concurrent review could be ambiguous | Added posted/unchecked/missing/expected-row-version guards | no Odoo bulk-selection transaction |
| Live responsive comparison unavailable | BrowserSkill tab was already borrowed by another session | no visual-parity claim |
