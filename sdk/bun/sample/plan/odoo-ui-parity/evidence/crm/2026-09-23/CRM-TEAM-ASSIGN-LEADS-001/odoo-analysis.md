# Odoo analysis

Reference: Odoo 19 Community source at `/home/nhanjs/projects/odoo/addons/crm`.

- `views/crm_team_views.xml:139-148` inserts a Sales Team form header button
  named `action_assign_leads`, labelled `Assign Leads`, highlighted, and
  guarded by lead/opportunity assignment enablement. It asks for confirmation:
  `This will assign leads to all members. Do you want to proceed?`
- `models/crm_team.py:187-221` runs `_action_assign_leads` with
  `force_quota=True` and `creation_delta_days=0`, then returns a client success
  notification titled `Leads Assigned` and logs the request on the team.
- `models/crm_team.py:228-320` reports allocated and salesperson-assigned
  counts. The member assignment helper is backed by the CRM lead model.
- `models/crm_lead.py:1880-1902` documents round-robin salesperson assignment
  when there are more leads than members.

The live reference database was not mutated. A visual read was blocked before
the borrowed tab could be inspected.
