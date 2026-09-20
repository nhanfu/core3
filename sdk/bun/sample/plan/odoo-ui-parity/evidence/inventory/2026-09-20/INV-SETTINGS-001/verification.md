# Verification

## Core3

- Runtime: `http://127.0.0.1:4541`.
- Actor: authenticated `admin@tms.local`.
- Route: `/inventory/settings`.
- Desktop: 1440x900; initial 31/12, Save changed the values, reload preserved
  20/3; API responses were 200 and failed requests were empty; document/client/
  inner widths were all 1440.
- Mobile: 390x844; Save changed the values, reload preserved 21/4; API responses
  were 200 and failed requests were empty; document/client/inner widths were all 390.
- Runtime permission test: `inventory.read` was rejected with 403 for both the
  page and mutation; `inventory.manage` could update the row.

Raw browser facts are in `core3-desktop.json` and `core3-mobile.json`.

## Odoo comparison

- Authenticated actor: supplied reference user `codex@core3.local`.
- Route: `http://127.0.0.1:8069/odoo/action-445`.
- Desktop and mobile authentication completed and widths were 1440 and 390
  respectively, but both captures returned an Odoo RPC error before the Settings
  form rendered. The technical details identify `ir.actions.server(445)` and
  `AttributeError: 'NoneType' object has no attribute
  'action_convert_to_subtask'` while evaluating `action =
  record.action_convert_to_subtask()`.
- Screenshots and the full captured response text are retained in
  `odoo-settings-desktop.png`, `odoo-settings-mobile.png`, and `odoo.json`.

This is bounded feature evidence, not full Inventory sign-off; the broader
module lifecycle remains open.
