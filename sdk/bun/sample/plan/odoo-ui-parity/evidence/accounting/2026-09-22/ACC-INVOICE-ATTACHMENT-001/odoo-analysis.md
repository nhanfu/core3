# Odoo analysis

- Addon: `account`, Odoo 19 Community, manifest version `1.4`; official demo
  data is declared by `demo/account_demo.xml`.
- Form source: `addons/account/views/account_move_views.xml` declares the
  invoice form, the draft-only attachment preview container, and
  `<chatter reload_on_attachment="True"/>`.
- Model source: `addons/account/models/account_move.py` declares
  `attachment_ids` as a one-to-many `ir.attachment` relation scoped to
  `res_model = account.move`.
- Permission boundary: the invoice form is protected by Accounting groups;
  Core3 maps viewing to `accounting.read` and uploading to `accounting.write`.
- Odoo's attachment UI is part of the invoice form/chatter rather than a
  separate Accounting menu/action. The bounded Core3 mapping therefore uses
  the existing shared OdooFormView attachment panel and keeps the page/API
  contract separate.
- Odoo desktop/mobile screenshots were not captured for this feature because
  BrowserSkill could not obtain ownership of the existing authenticated tab;
  see `browser-check.md`. No visual claim is made.
