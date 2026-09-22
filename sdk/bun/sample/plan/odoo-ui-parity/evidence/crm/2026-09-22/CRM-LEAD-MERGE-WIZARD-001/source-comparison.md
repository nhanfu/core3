# Source comparison and gap matrix

| Odoo contract | Existing Core3 before wave | Change | Classification |
| --- | --- | --- | --- |
| `action_merge_opportunities` opens a modal form | `merge_leads` was a direct server bulk mutation with a confirmation message | Upgrade the existing action to `server_form`, preserving its stable Core3 ID and `crm.leads.merge` route | partial -> implemented |
| `Merge Leads/Opportunities` title and Merge/Cancel footer | No form fields or submit/cancel labels | Declare title, submit label, and cancel label in `api/leads.yaml` | missing -> implemented |
| `Assign opportunities to` Salesperson and Sales Team | Survivor always inherited its first non-empty assignment | Add selector fields using existing CRM salesperson/team datasources and apply explicit values to survivor | partial -> implemented |
| Selected open rows only; closed rows excluded | Guard required at least two open rows and retained closed rows | Keep guard and test mixed open/closed selection plus one/closed-only rejection | implemented and regression-tested |
| Merge dependencies into survivor | Existing mutation reparented `crm_activities` | Preserve and test activity reparenting | implemented and regression-tested |
| Authenticated desktop/mobile modal comparison | No fresh capture in this run | Borrow existing signed-in tab and capture when available | blocked; no visual claim |

The page/API separation remains unchanged: the layout is in `pages/leads.yaml`,
the datasource/action contract is in `api/leads.yaml`, and both join through
`page.id: leads`.
