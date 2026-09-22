# Odoo analysis

The authoritative Odoo 19 source is:

- `addons/crm/wizard/crm_merge_opportunities.py`
- `addons/crm/wizard/crm_merge_opportunities_views.xml`
- `addons/crm/models/crm_lead.py`, method `merge_opportunity`

`action_merge_opportunities` is an `ir.actions.act_window` with
`res_model=crm.merge.opportunity`, `view_mode=form`, and `target=new`, bound to
the `crm.lead` list and kanban. The transient form is titled
`Merge Leads/Opportunities`; its assignment group is labelled
`Assign opportunities to` and contains Salesperson and Sales Team. It also
shows the selected Leads/Opportunities and has Merge and Cancel footer buttons.

The wizard filters out won records in `default_get`, accepts optional user/team
assignment, and delegates to `crm.lead.merge_opportunity`. Odoo's merge model
transfers dependent records, including activities, to the selected survivor.

The live authenticated action could not be inspected in this run because the
shared Odoo tab was already borrowed by another BrowserSkill session. The
reference database was not mutated.
