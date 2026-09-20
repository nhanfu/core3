# Functionality checklist

| Capability | Result | Evidence |
| --- | --- | --- |
| Configuration menu and list route | PASS | Core3 captures and `core3.json` |
| New operation type form | PASS | `core3-operation-type-create-modal.png` |
| Durable create row version | PASS | Focused integration test |
| Edit source/destination and code | PASS | Edited detail and reload captures |
| Archive/restore lifecycle | PASS | Focused integration test; browser lifecycle remains covered by the API contract |
| Open-transfer archive guard | PASS | Focused integration test against `operation-receipts` |
| Duplicate/invalid/required validation | PASS | Focused integration test |
| Permission boundary | PASS | Focused runtime 403 page/action assertions |
| File-backed restart | PASS | Focused integration test |
| Odoo paired comparison | PARTIAL | Authenticated action-426 `Oops!` blocker at both viewports |
