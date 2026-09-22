# Odoo analysis

- Local source: `/home/nhanjs/projects/odoo/addons/account/views/account_move_views.xml`
  declares `button_set_checked` with label `Reviewed`, object type, the
  `account.group_account_user` group, and visibility `state != 'posted' or
  checked`.
- Local model source:
  `/home/nhanjs/projects/odoo/addons/account/models/account_move.py` defines
  `button_set_checked()` and delegates to `set_moves_checked()`, which sets
  `checked = True` for posted moves.
- The live authenticated tab could not be borrowed through BrowserSkill, so a
  live click and desktop/mobile capture were not obtained. No visual-parity
  claim is made.
