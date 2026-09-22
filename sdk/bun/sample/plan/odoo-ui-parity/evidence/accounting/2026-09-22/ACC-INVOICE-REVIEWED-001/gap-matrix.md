# Gap matrix

| Gap | Change | Boundary |
| --- | --- | --- |
| Invoice detail had no Reviewed action or checked field | Added page/API-matched header action and datasource field | bounded to invoice detail |
| Review state was not durable | Added migration `20260922170000-053-accounting-invoice-reviewed.yaml` | boolean flag only; no audit actor/timestamp |
| Concurrent/repeated review could be ambiguous | Added expected-row-version, posted, unchecked, and missing guards | one-record action only |
| Live responsive comparison unavailable | Borrow confirmation did not transfer the authenticated Odoo tab | no visual-parity claim |

Odoo's journal-entry bulk review list, reviewer metadata, and any future
unreview workflow remain outside this stable-ID slice.
