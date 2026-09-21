# Source comparison

| Contract | Odoo 19 source | Core3 result |
| --- | --- | --- |
| Action | `crm_lead_action_team_overdue_opportunity` in `crm_team_views.xml` | `view_crm_team_overdue_opportunities` opens the team-scoped route |
| Scope | `type = opportunity`, active team context | Team ID is required in the datasource and context lookup |
| Overdue rule | `date_closed = false` and `date_deadline < today` | Open stages exclude `Won`/`Lost`; non-null `expected_closing < as_of/CURRENT_DATE` |
| Views | Kanban, List, Graph, Form, Calendar, Pivot | Visible Kanban/List/Graph/Calendar/Pivot tabs plus shared lead-detail form drill-down |
| Defaults | Team, opportunity type, current user | Team query context and `type: opportunity` page default |
| Empty state | Action has no custom help text | Explicit no-overdue state explains the date rule |

The Odoo `date_deadline` field is represented by Core3's existing
`expected_closing` field. The bounded slice intentionally does not add a
second lead form or duplicate mutation workflow; row navigation reuses the
existing CRM lead detail contract.
