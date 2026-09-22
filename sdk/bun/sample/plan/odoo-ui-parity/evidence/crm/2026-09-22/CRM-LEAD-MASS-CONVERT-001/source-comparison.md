# Source comparison

| Odoo behavior | Core3 implementation | Status |
| --- | --- | --- |
| `action_crm_send_mass_convert` list/kanban-bound modal | `convert_leads_mass` bulk action on `pages/leads.yaml` | Implemented |
| `Convert to Opportunity` modal title | `title: Convert to Opportunity` in `api/leads.yaml` | Implemented |
| `Convert to Opportunities` submit | `submit_label` and `crm.leads.mass_convert` | Implemented |
| Sales Team assignment | `team_id` select; active-team and membership guards | Implemented |
| Salesperson assignment | `user_id` select; existing single `crm_leads.salesperson` field | Bounded mapping |
| Force assignment | Boolean field controls overwrite versus preserve behavior | Implemented |
| Odoo `user_ids` many2many | Not representable without changing the CRM lead schema | Open gap |
| Apply deduplication / duplicate merge | Not included; kept separate from the existing merge wizard | Open gap |
| Lead conversion and allocation | Type changes to opportunity, assignment, row-version increment, durable activity | Implemented |
| Closed/stale/invalid selection behavior | Per-row validation inside one transaction | Implemented |
