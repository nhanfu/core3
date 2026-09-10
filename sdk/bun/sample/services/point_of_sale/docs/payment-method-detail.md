# POS payment method detail

The payment-method detail follows Odoo's `pos.payment.method` form contract:

- the record title is `Method`, not `Payment method`;
- the detail is read-only until the POS manager uses `Edit`;
- `Company` remains display-only while `Method`, `Journal`, `Point of Sale`, and `Active` are editable through the POS-owned update action.

The Core3 slice intentionally keeps the current POS-owned storage fields. Odoo-only accounting integration fields remain outside this bounded parity change.
