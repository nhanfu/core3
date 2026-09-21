# Odoo analysis

- Addon/version: local Odoo 19 Community `account` addon.
- Form source: `addons/account/views/account_move_views.xml`, the `account.move` form declares `button_draft` with label `Reset to Draft`, object type, and visibility through `show_reset_to_draft_button`.
- Model source: `addons/account/models/account_move.py`, `button_draft` accepts only `cancel` or `posted` records after Odoo's draftability checks, then restores `state='draft'`.
- Live route: `http://localhost:8069/odoo/invoicing/10`, database `core3_reference`, authenticated with the existing QA session.
- Live desktop observation at 1916x833 showed `Reset to Draft` beside Send, Print, Pay, Preview, and Credit Note on posted `INV/2026/00008`. Clicking it produced the Draft form with Confirm/Cancel, editable invoice fields, and Draft status; Confirm restored the posted state.
- Core3 route selected: `/accounting/invoice-detail?id=accounting-invoice-demo-001`.
