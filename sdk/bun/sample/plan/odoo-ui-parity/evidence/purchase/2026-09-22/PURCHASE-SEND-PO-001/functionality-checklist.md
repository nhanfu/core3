# Functionality checklist

| Case | Result |
| --- | --- |
| `purchase-detail` page/API use the same `page.id` | PASS: focused test |
| Confirmed prefill returns vendor, Purchase Order body, and PDF name | PASS: focused test and source query |
| Received order is also eligible and keeps its state | PASS: focused test |
| Confirmed send records template, recipient, body, attachment, actor, and history | PASS: focused test |
| RFQ state is rejected without an email row | PASS: focused test |
| Missing/stale order and invalid vendor/content/actor guards are atomic | PASS: focused test |
| File-backed restart and migration replay preserve one history row | PASS: focused test |
| Purchase write boundary is declared on the action | PASS: focused contract test |
| Odoo desktop/mobile composer is captured | PASS: authenticated screenshots |
| Core3 desktop/mobile composer opens and sends | BLOCKED: shared server-form dispatch produced no modal or request |
