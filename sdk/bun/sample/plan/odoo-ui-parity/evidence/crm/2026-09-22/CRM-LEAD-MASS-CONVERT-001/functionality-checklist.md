# Functionality checklist

| Check | Result |
| --- | --- |
| Page/API contracts join through `page.id: leads` | Pass |
| Selectable Leads list exposes Convert to opportunities bulk action | Pass |
| Modal has submit/cancel and assignment fields | Pass; single salesperson is the Core3 schema-compatible bounded mapping |
| Empty selection rejected | Pass |
| Missing, already-converted, and closed selections rejected | Pass |
| Inactive team and invalid salesperson/team assignment rejected | Pass |
| Successful conversion persists type, assignment, row version, and activity | Pass |
| A later invalid selected row rolls back earlier work | Pass |
| File-backed restart persistence | Not separately exercised; existing `crm_leads` storage is unchanged by this slice |
| Odoo authenticated desktop comparison at 1440x900 | Blocked before borrow |
| Odoo authenticated mobile comparison at 390x844 | Blocked before borrow |
| Core3 authenticated desktop/mobile comparison | Not captured; no visual-parity claim |
| Odoo multi-salesperson and deduplication branches | Open gap, explicitly not claimed |
