# Functionality checklist — `PURCHASE-RFQ-CONFIRM-001`

| Stable requirement | Result |
| --- | --- |
| Page/API are joined by `page.id` | PASS |
| Exact Odoo label and list bulk-action placement | PASS |
| `purchase.write` permission declared | PASS |
| Empty selection rejected | PASS |
| To Approve-only selection rejected | PASS |
| Draft and Sent rows confirm in one selection | PASS |
| Mixed To Approve row remains unchanged | PASS |
| Row versions increment only for confirmed rows | PASS |
| Deterministic Sent fixture is idempotent | PASS |
| State survives restart and migration replay | PASS |
| Authenticated desktop/mobile browser interaction | BLOCKED: BrowserSkill borrow timeout |
