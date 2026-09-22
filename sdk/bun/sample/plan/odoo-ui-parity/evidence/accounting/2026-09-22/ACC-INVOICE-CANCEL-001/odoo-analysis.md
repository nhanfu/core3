# Odoo analysis

- Addon: `account`, Odoo 19 Community.
- Form source: `/home/nhanjs/projects/odoo/addons/account/views/account_move_views.xml`.
- Model source: `/home/nhanjs/projects/odoo/addons/account/models/account_move.py`.
- Odoo form label: `Cancel` for invoice-like draft moves; `Cancel Entry` for
  draft journal entries. The invoice button is hidden when `state != 'draft'`.
- `account.move.button_cancel` first handles posted moves through
  `button_draft`, then requires draft state and writes the cancelled state.
- Live browser target: `http://localhost:8069/odoo/contacts/9` was present in
  the shared user tab list; the intended invoice route was not opened because
  the tab borrow confirmation did not complete.
