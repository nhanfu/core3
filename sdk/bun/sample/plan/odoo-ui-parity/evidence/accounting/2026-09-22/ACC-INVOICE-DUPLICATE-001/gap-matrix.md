# Gap matrix

| Gap | Impact | Decision |
| --- | --- | --- |
| Core3 has no invoice-line table in this bounded surface | Duplicate copies header/accounting totals but not individual Odoo `account.move.line` rows | Keep outside the smallest stable-ID slice; line CRUD/copy is follow-up work |
| Core3 does not run Odoo's journal sequence engine | Duplicate uses a deterministic `(copy)` name instead of a newly allocated Odoo sequence number | Preserve deterministic test data and document the bounded approximation |
| Core3 does not reproduce Odoo's full `copy_data()` field graph | Attachments, relational followers, and all computed fields are not cloned | Reset protected/system fields and defer relational-copy parity |
| No paired authenticated Core3/Odoo desktop/mobile capture was taken for this bounded slice | Functional/API evidence does not prove visual parity | Hold visual sign-off; do not claim parity |
