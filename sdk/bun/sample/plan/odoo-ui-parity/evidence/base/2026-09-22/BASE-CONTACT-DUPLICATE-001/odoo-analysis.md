# Odoo 19 reference analysis

Local source:

- `odoo/addons/base/models/res_partner.py:564-569` appends `" (copy)"` in
  `copy_data` when no replacement name is supplied.
- `odoo/addons/contacts/views/contact_views.xml` defines the Contacts action,
  list/kanban/form views, and menu wiring.
- `odoo/addons/base/views/res_partner_views.xml` defines the partner form.

Authenticated live reference (`http://localhost:8069/odoo/contacts/73`, bsk
browser instance `245ea108`, session `vpqt`): the contact form Actions menu
showed `Edit Properties`, `Duplicate`, `Archive`, `Send SMS`, `Download
(vCard)`, and `Grant portal access`. Selecting `Duplicate` navigated to an
editable contact named `Codex QA 2 (copy)`. This is the source-backed bounded
workflow implemented here.
