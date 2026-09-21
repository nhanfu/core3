# Gap matrix

| Requirement | Evidence | Status |
| --- | --- | --- |
| Source-backed uncovered feature | Odoo model/view inspection and live Questions tab | pass |
| Page/API YAML separation | matching event-detail page ids and focused assertion | pass |
| Permission boundary | events.read datasource; events.write lookup/mutations | pass |
| Durable migration and seeded relation | migration 035 and restart test | pass |
| Workflow/state guard | completed/cancelled guard plus parent/link row versions | pass |
| Duplicate and invalid-link guard | focused mutation assertions | pass |
| Authenticated desktop/mobile reference evidence | browser captures and hashes | pass |
| Full Events module sign-off | actor matrix and complete Core3 visual route coverage | open |
