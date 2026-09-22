# Source comparison

| Odoo 19 contract | Core3 bounded implementation | Result |
| --- | --- | --- |
| `account.move.button_set_checked` exposes `Reviewed` on posted unchecked moves | `review_accounting_invoice` is a matching `invoice-detail` header action | implemented |
| Review action marks the posted move checked | `accounting_invoices.checked` is added by migration and set atomically to `TRUE` | implemented |
| Accounting User group is required | Core3 action requires `accounting.write` | mapped permission boundary |
| Repeated/stale/non-posted/missing records are rejected | YAML guards enforce posted + unchecked + expected `row_version` and missing-record status | implemented |
| Odoo UI action and responsive visual state | BrowserSkill borrow confirmation did not transfer the authenticated tab | blocked; no visual claim |

The slice intentionally does not implement Odoo's bulk Review action, journal
entry list filters, or a reverse/unreview operation; the source action itself
only marks posted moves reviewed.
