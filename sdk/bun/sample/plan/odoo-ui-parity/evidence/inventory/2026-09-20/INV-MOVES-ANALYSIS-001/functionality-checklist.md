# Functionality checklist

| Check | Result |
| --- | --- |
| Reporting menu and action mapping | PASS: source/menu/API contract and Core3/Odoo captures |
| Default Done report | PASS: six deterministic Done rows in Core3; Odoo report inspected |
| Ready and To Do states | PASS: Assigned/Waiting filter assertions |
| Incoming/Outgoing/Inventory filters | PASS: focused source filter assertions |
| Search and date boundaries | PASS: focused query assertions |
| Pivot aggregation | PASS: deterministic Receipts and Inventory Adjustments totals |
| Graph/Kanban/List/Form declarations | PASS: page schema and browser evidence |
| Detail navigation and missing record | PASS: read-only detail and 404 assertion |
| Empty/transport states | PASS: 0-row and 503 assertions |
| Read permission boundary | PASS: direct API/page access rejects missing permission |
| Restart durability | PASS: eight rows and detail survive close/reopen |
| Responsive authenticated comparison | PASS: Core3 and Odoo desktop/mobile captures; no overflow/errors |

CRUD mutation is intentionally not applicable: Odoo's source report is
read-only and the Core3 contract exposes no mutation action.
