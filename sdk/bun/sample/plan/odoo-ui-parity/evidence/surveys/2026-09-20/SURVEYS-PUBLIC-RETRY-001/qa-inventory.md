# QA inventory

Claims and controls checked:

| Claim/control | Functional check | Visual state | Evidence |
| --- | --- | --- | --- |
| Retry a completed response | POST retry returns a new attempt and `start_url` | Completed print review before retry | Core3 desktop/mobile print screenshots and browser JSON |
| Resume new attempt | GET with retry token returns `In Progress` | Public start/question surface | Core3 desktop/mobile retry-start screenshots and browser JSON |
| Durable replay | File-backed reopen and repeated idempotency key retain one row | Not applicable; persisted API state | Focused integration test |
| Permission/guards | YAML `surveys.public`, wrong token, wrong state, closed survey, and method guards | Odoo access-error blocker | Focused integration test and Odoo screenshots |
| Responsive boundary | Browser telemetry checks document/body width | 1440x900 and 390x844 | `core3-browser-results.json`, `odoo-browser-results.json` |

Exploratory cases: invalid source token and an in-progress source response; both
must leave the response table unchanged. A closed target survey is also tested.
