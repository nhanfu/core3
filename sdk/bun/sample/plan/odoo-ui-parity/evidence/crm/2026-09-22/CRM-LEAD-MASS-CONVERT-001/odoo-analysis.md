# Odoo analysis

- Addon/source: Odoo 19 Community CRM, local checkout
  `/home/nhanjs/projects/odoo/addons/crm`.
- Action: `crm.action_crm_send_mass_convert` in
  `wizard/crm_lead_to_opportunity_mass_views.xml`.
- Model: `crm.lead2opportunity.partner.mass`, transient model inheriting the
  single-lead conversion wizard.
- Binding: `crm.lead`, `binding_view_types` = `list,kanban`, modal target.
- Form: `Convert to Opportunity`; conversion options; assignment group with
  Sales Team, Salespersons, and Force assignment; duplicate information; the
  related-customer section; `Convert to Opportunities` and `Cancel`.
- Source behavior: `action_mass_convert` optionally deduplicates selected
  leads, then applies conversion and assignment to the active records. The
  wizard's mass model computes the conversion action as `convert` and the
  related-customer mode as `each_exist_or_create`.

The live authenticated Odoo form could not be opened in this run because the
required user tab was already borrowed by another BrowserSkill session. The
source checkout is the authoritative analysis for this bounded implementation;
live visual behavior is unverified.
