# Source comparison

| Behavior | Odoo 19 source/live | Core3 before | Core3 after |
| --- | --- | --- | --- |
| Detail action | `button_draft`, visible on posted `INV/2026/00008` | Missing | `reset_accounting_invoice_to_draft`, page/API joined by `invoice-detail` |
| State transition | Posted or cancelled → Draft | Workflow only exposed Draft → Posted and cancel | YAML workflow declares Posted/Cancelled → Draft |
| Editability | Draft form exposes Confirm/Cancel and editable fields | No reverse transition from detail | Existing OdooFormView becomes Draft after mutation |
| Guard | Odoo rejects non-draftable records | No action | `accounting.write`, source state, expected row version, atomic update |
| Persistence | Odoo state/chatter transition persists | N/A | DuckDB restart and migration replay covered |
