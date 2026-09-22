# Gap matrix

| Stable ID | Requirement | Core3 source | Result |
| --- | --- | --- | --- |
| CRM-LEAD-MASS-CONVERT-001-A | Expose mass conversion from selectable Leads list/kanban | `services/crm/pages/leads.yaml`, `api/leads.yaml` | Pass |
| CRM-LEAD-MASS-CONVERT-001-B | Persist conversion and assignment | Existing `crm_leads` / `crm_activities` tables and YAML mutation | Pass |
| CRM-LEAD-MASS-CONVERT-001-C | Guard permissions, selection, state, team, and stale rows | `crm.write`, mutation guards and expect-changed steps | Pass |
| CRM-LEAD-MASS-CONVERT-001-D | Odoo many2many salesperson allocation | Core3 has one `salesperson` column | Open, documented |
| CRM-LEAD-MASS-CONVERT-001-E | Odoo deduplication and related-customer branch | Existing CRM merge/customer actions remain separate | Open, documented |
| CRM-LEAD-MASS-CONVERT-001-F | Authenticated desktop/mobile visual comparison | BrowserSkill tab borrow | Blocked by another session owning the tab |
