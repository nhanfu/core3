# Functionality checklist

| Stable behavior | Result |
| --- | --- |
| Odoo source/action mapping | Pass: `category_open_putaway` opens the existing Putaway Rules action with active category context |
| Category detail stat | Pass: Office Supplies exposes the active `putaway_rule_count` and the permissioned action |
| Category filtering | Pass: Office Supplies returns its durable category rule and excludes Furniture |
| Company scope | Pass: an outside company returns no category rules |
| Empty context | Pass: explicit empty fixture state returns no rows |
| Transport boundary | Pass by contract: existing Putaway Rules datasource retains its declared 503 state |
| Durable fixture | Pass: migration replay and file-backed restart retain `putaway-office-supplies` without duplicates |
| Permission boundary | Pass by contract: navigation requires `inventory.multi_location`; list CRUD remains manager-owned |
| Responsive/authenticated visual comparison | Blocked: the authenticated Odoo tab could not be borrowed; no visual pass claimed |
