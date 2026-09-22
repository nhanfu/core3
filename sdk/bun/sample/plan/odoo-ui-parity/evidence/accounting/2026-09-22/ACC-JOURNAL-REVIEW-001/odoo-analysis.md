# Odoo analysis

- Addon/version: local Odoo 19 Community `account` addon.
- View source: `/home/nhanjs/projects/odoo/addons/account/views/account_move_views.xml`
  declares `accountant_confirm_entries_action`, label `Review Entries`,
  `binding_view_types` `list,kanban`, Accounting User group, and calls
  `model.check_selected_moves()`.
- Model source: `/home/nhanjs/projects/odoo/addons/account/models/account_move.py`
  defines `check_selected_moves()`, delegates to `set_moves_checked()`, and
  only marks posted moves `checked = True`.
- Core3 route selected: `/accounting/journal-entries`, with row navigation to
  `/accounting/journal-entry-detail`.
- The live authenticated Odoo tab could not be borrowed through BrowserSkill;
  no live click or desktop/mobile capture was obtained.
