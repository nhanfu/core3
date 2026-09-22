# Functionality checklist

| Case | Class | Expected result | Result |
| --- | --- | --- | --- |
| ACC-INVOICE-ATTACHMENT-001-A | functional | Invoice detail page binds attachment datasource and upload/download actions by `page.id`. | pass |
| ACC-INVOICE-ATTACHMENT-001-B | data | Deterministic attachment metadata is visible for the invoice and migration replay does not duplicate it. | pass |
| ACC-INVOICE-ATTACHMENT-001-C | permission | `accounting.read` can list/download; `accounting.write` is required to upload. | pass |
| ACC-INVOICE-ATTACHMENT-001-D | validation | Empty/oversized files, duplicate names, missing invoices, and missing actors are rejected without a row. | pass in contract; invalid-size branch is declared and covered by the shared mutation contract |
| ACC-INVOICE-ATTACHMENT-001-E | concurrency | Upload requires the invoice row version and advances it atomically; stale upload is rejected. | pass |
| ACC-INVOICE-ATTACHMENT-001-F | integration | Uploaded bytes are served through the protected storage route and remain available after DuckDB close/reopen. | pass |
| ACC-INVOICE-ATTACHMENT-001-G | responsive/visual | Authenticated Odoo/Core3 desktop `1440x900` and mobile `390x844` attachment panel comparison. | blocked by BrowserSkill tab ownership; no visual claim |

Out of scope: attachment deletion, external mail delivery, and PDF/report
generation. Those are separate Accounting gaps and are not claimed here.
