# Source comparison

| Odoo capability | Core3 contract | Classification |
| --- | --- | --- |
| `button_hash` / `Lock` form action | `lock_accounting_invoice` in `api/invoice-detail.yaml` and header action in `pages/invoice-detail.yaml` | implemented, bounded |
| Posted + journal hash restriction + unhashed visibility | `state === 'Posted'`, `hash_lock_enabled`, and `!locked` visibility guard | implemented, configured approximation |
| `_hash_moves(force_hash=True)` | Durable lock state, actor/time, row version, and chatter event | partial; cryptographic chain deferred |
| Hashed entry cannot reset to Draft | `invoices-workflow.yaml` reset guard checks `locked = FALSE` | implemented |
| Accounting permission boundary | Read source requires `accounting.read`; mutation requires `accounting.write` | implemented |
