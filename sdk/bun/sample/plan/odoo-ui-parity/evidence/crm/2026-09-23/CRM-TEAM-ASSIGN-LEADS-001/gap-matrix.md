# Gap matrix

| Stable case | Result | Evidence / reason |
| --- | --- | --- |
| `CRM-TEAM-ASSIGN-LEADS-001-A` page/API binding | Pass | Focused integration test |
| `CRM-TEAM-ASSIGN-LEADS-001-B` permission and confirmation | Pass at YAML contract level | Focused integration test; browser blocked |
| `CRM-TEAM-ASSIGN-LEADS-001-C` deterministic assignment/conversion | Pass | Focused integration test, 3 stable seeded leads |
| `CRM-TEAM-ASSIGN-LEADS-001-D` missing/archived guard | Pass | Focused integration test |
| `CRM-TEAM-ASSIGN-LEADS-001-E` migration replay/restart | Pass | Focused integration test |
| `CRM-TEAM-ASSIGN-LEADS-001-F` Odoo domains/quotas/cross-team allocation | Open | Current CRM schema has no assignment-domain or quota projection |
| `CRM-TEAM-ASSIGN-LEADS-001-G` duplicate merge/team chatter note | Open | Separate bounded follow-up work |
| `CRM-TEAM-ASSIGN-LEADS-001-H` authenticated desktop/mobile comparison | Blocked | Existing Odoo tab already borrowed by BrowserSkill session `gzhm` |
