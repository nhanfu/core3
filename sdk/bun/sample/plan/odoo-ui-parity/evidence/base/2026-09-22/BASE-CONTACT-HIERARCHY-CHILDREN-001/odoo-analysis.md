# Odoo 19 reference analysis

Local source reviewed before implementation:

- `odoo/addons/base/models/res_partner.py:215-217` defines `parent_id` and
  `child_ids` on `res.partner`.
- `odoo/addons/base/views/res_partner_views.xml:219-289` renders the Contacts
  notebook tab as an inline `child_ids` kanban and Contact / Address form.
- `addons/contacts/views/contact_views.xml:3-35` defines the Contacts window
  action and its list, kanban, and form view ordering.

The live authenticated tab could not be inspected in this worker because the
required signed-in tab was already borrowed by another BrowserSkill session.
No live visual observation is represented as completed evidence.
