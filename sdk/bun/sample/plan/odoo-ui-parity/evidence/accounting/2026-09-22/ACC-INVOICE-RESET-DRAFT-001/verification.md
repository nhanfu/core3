# Verification

## Authenticated Odoo reference

- Browser instance: `245ea108`; database: `core3_reference`; route:
  `http://localhost:8069/odoo/invoicing/10`.
- Desktop capture: 1916x833 posted and draft states.
- Mobile capture: 390x844 posted state, overflow menu, and draft state.
- The posted invoice exposed Reset to Draft; the action entered Draft with
  Confirm/Cancel controls. Confirm restored the invoice to Posted.
- Captures are retained under `/tmp/core3-odoo-parity/accounting-invoice-reset-to-draft-20260922/`.

## Core3 runtime

Core3 browser verification could not start because page discovery fails on
unrelated dirty Inventory/Manufacturing/Project definitions:

```text
PageSchemaError: Invalid page definition:
- components[0].views[5].category_field is required for graph
- components[0].views[6].title_field is required for activity
- components[0].views[6].activity_types must be a non-empty array for activity
```

No Core3 screenshot or visual-parity claim is made. A clean-runtime replay is
required for authenticated desktop/mobile Core3 checks.
