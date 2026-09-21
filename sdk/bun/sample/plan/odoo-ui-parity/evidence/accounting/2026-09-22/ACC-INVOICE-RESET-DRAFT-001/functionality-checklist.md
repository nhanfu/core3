# Functionality checklist

| Case | Class | Expected result |
| --- | --- | --- |
| ACC-RESET-FUNC-001 | functional | Invoice detail exposes `Reset to Draft` only for Posted/Cancelled records and transitions to Draft. |
| ACC-RESET-WF-002 | workflow | Posted and Cancelled → Draft succeed; Draft/Paid and duplicate/stale attempts fail with no partial write. |
| ACC-RESET-PERM-003 | permission | The page remains `accounting.read`; the transition requires `accounting.write` at the API boundary. |
| ACC-RESET-DATA-004 | data | Row version increments exactly once and state survives DuckDB close/reopen and idempotent migration replay. |
| ACC-RESET-UI-005 | visual/responsive | Authenticated Odoo/Core3 posted and Draft states are checked at desktop 1440x900 and mobile 390x844 with no page overflow or failed requests. |

Out of scope: Odoo's full `_check_draftable` tax-cash-basis/hash-chain rules,
multi-record bulk reset, government cancellation requests, and invoice line
editing beyond the existing Core3 Draft form.
