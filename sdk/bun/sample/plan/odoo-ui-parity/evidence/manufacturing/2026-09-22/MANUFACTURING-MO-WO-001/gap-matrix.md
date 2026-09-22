# Gap matrix

| Odoo behavior | Before | Bounded change | Result |
| --- | --- | --- | --- |
| Record-scoped Work Orders action | Inline MO tab only | Add page/API route pair | PASS |
| Five action modes | No standalone action contract | Declare list/form/calendar/pivot/graph | PASS |
| Active MO domain | No route scope | Join durable rows with `p.id = :id` | PASS |
| Operator actions | Existing workflow elsewhere | Reuse guarded six-transition workflow | PASS |
| Persistence | Durable rows existed | Add idempotent production/sequence index | PASS |
| Empty/error/permission boundaries | No action datasource | Add empty/not-found/401/403/503 contracts | PASS |
| Live Odoo visual comparison | Not captured | BrowserSkill borrow blocked | BLOCKED; no visual claim |
