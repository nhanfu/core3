# Gap matrix

| Contract | Result | Evidence |
| --- | --- | --- |
| Applicant form Applications stat | Implemented | `pages/applicant-detail.yaml`, page/API contract test |
| `action_open_applications` related domain | Implemented for deterministic email/phone/pool-link fields | `api/applicant-applications.yaml`, query test |
| Archived list/form applications | Implemented as read-only list with existing detail navigation | query assertions for Archived status |
| Company and read permission boundary | Implemented | datasource permission/error contract and wrong-company test |
| Durable deterministic relationship | Implemented | migration 026 and restart test |
| Authenticated Odoo desktop/mobile visual parity | Blocked | BrowserSkill borrow timeout; see `browser-check.md` |
| Full Odoo action runtime, chatter, attachments, and normalized LinkedIn matching | Remaining gap | Explicitly outside this bounded slice |
