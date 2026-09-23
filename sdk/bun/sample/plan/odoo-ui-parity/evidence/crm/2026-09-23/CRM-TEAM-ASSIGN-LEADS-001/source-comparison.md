# Source comparison

| Concern | Odoo 19 source | Core3 bounded implementation | Result |
| --- | --- | --- | --- |
| Entry point | `sales_team_form_view_in_crm` header object button `action_assign_leads` | `pages/team-detail.yaml` header action `assign_crm_team_leads` | Pass |
| Confirmation | Exact confirmation asks whether to assign leads to all members | YAML `confirm` preserves the source wording | Pass |
| Permission | Odoo method limits assignment to sales managers/system users | `crm.manage` action permission | Pass at contract boundary |
| Assignment | `_action_assign_leads(force_quota=True, creation_delta_days=0)` allocates and assigns | SQL selects team-owned open unassigned leads and active members | Bounded |
| Distribution | `_handle_salesmen_assignment` uses round-robin | Stable `ROW_NUMBER()` member/lead pairing | Pass for bounded member set |
| Conversion | Odoo assignment pipeline converts assigned leads | Mutation sets `type = 'opportunity'` and increments row version | Pass for CRM projection |
| Notification/audit | Odoo returns `Leads Assigned` and logs team note | Core3 refreshes team datasources; no team chatter note yet | Open |
| Domains/quotas/duplicates | Odoo applies assignment domains, quotas, cross-team allocation, duplicate merge | Not present in current CRM schema; intentionally documented | Open |
