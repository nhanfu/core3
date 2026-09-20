# Verification

- Core3 authenticated actor: `admin@tms.local` on `http://127.0.0.1:4541`.
- Core3 viewports: desktop `1440x900`, mobile `390x844`.
- Core3 list, create modal, detail, edit, and reload rendered. The edited
  `WH-BROWSER-FINAL` value and Stock/Transit labels survived reload.
- `core3.json` records an empty `failures` array.
- Odoo authenticated actor: `codex@core3.local` on
  `http://127.0.0.1:8069/odoo/action-426`.
- Odoo desktop and mobile both authenticated successfully, then rendered the
  generic `Oops!` error before the Operations Types list/form. This is the exact
  comparison blocker, not a visual parity pass.
