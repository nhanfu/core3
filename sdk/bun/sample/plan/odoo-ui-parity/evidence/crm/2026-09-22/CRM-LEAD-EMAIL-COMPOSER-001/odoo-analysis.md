# Odoo 19 source analysis

Inspected local source under `/home/nhanjs/projects/odoo` before editing.

- `addons/crm/views/crm_lead_views.xml`: the lead form exposes
  `action_lead_mail_compose` with `res_model="mail.compose.message"`,
  `target="new"`, and `default_composition_mode: comment`.
- The same view exposes `action_lead_mass_mail` on the opportunity list and
  kanban with `default_composition_mode: mass_mail`.
- The list includes the `Email` action for selected leads and a row email
  action for open leads; lost rows hide the action.
- `addons/mail/wizard/mail_compose_message.py` defines the composer modes and
  the subject/body/template/recipient/attachment concepts used by the CRM
  actions.

This establishes two stable source-backed surfaces: one-lead compose and
selected-lead mass compose.
