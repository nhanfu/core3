# Source comparison

| Odoo behavior | Existing Core3 state | Bounded change |
| --- | --- | --- |
| Draft invoice form exposes `button_cancel` / `Cancel` | `invoice-detail.yaml` had no Cancel header action | Add `cancel_accounting_invoice_detail` with the Odoo draft/non-journal visibility rule |
| Cancel writes the move to cancelled state | Invoice workflow declared `cancel` but had no mutation, so the route was not executable | Add an explicit guarded SQL mutation with atomic version increment |
| Posted invoice is reset to draft before visible Cancel | Core3 already exposes Reset to Draft | Keep Cancel Draft-only; require the existing reset path first |
| Odoo requires accounting write access | Existing invoice workflow permission is `accounting.write` | Preserve and test direct API denial |
