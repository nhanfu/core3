# Odoo analysis

Inspected local Odoo 19 source before editing:

- `addons/account/views/account_move_views.xml:776-777` declares `button_hash`,
  label `Lock`, and hides it unless the move is posted, the journal hash table
  is restricted, and `inalterable_hash` is empty.
- `addons/account/models/account_move.py:6283-6284` implements
  `button_hash()` with `_hash_moves(force_hash=True)`.
- `addons/account/models/account_move.py:6280-6281` prevents reset-to-draft
  for a move with `inalterable_hash`.
- `addons/account/models/account_move.py:4604-4614` computes hashes and logs
  `This journal entry has been secured.`.

BrowserSkill authenticated inspection used the active Odoo service
`http://localhost:8069` and the `core3_reference` login context without reading
or printing credentials. The invoice route `/odoo/invoicing/10` rendered
`INV/2026/00008` as Posted with Send, Print, Pay, Preview, Credit Note, and
Reset to Draft. Lock was not rendered because the reference journal did not
have `restrict_mode_hash_table` enabled.
