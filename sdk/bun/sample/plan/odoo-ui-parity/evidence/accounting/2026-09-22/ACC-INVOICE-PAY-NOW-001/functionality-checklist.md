# Functionality checklist

| Case | Class | Expected result | Result |
| --- | --- | --- | --- |
| ACC-PAY-NOW-FUNC-001 | functional | Posted customer invoice/credit note Preview exposes Pay Now and opens the page/API-bound payment form | pass in contract tests; live click blocked |
| ACC-PAY-NOW-DATA-002 | data | Pay Now creates one durable pending payment transaction linked to the invoice without changing its residual | pass |
| ACC-PAY-NOW-GUARD-003 | workflow | Missing, stale, paid/non-posted, duplicate-pending, invalid-method, and failed-write requests are rejected atomically | pass |
| ACC-PAY-NOW-PERM-004 | permission | Read form/navigation use `accounting.read`; creation uses `accounting.write` | pass in YAML contract |
| ACC-PAY-NOW-DATA-005 | data | Payment relation survives DuckDB close/reopen and migration replay | pass |
| ACC-PAY-NOW-UI-006 | visual/responsive | Odoo Pay Now click and Core3 desktop/mobile comparison are captured | blocked; no visual-parity claim |
