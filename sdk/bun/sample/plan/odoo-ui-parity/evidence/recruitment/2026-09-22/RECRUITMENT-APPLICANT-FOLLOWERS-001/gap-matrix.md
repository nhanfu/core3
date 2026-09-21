# Gap matrix

| Gap | Required behavior | Files/contracts | Verification |
| --- | --- | --- | --- |
| Missing action | Applicant list/kanban opens follower wizard | `pages/applicants.yaml`, `api/applicants.yaml` | YAML contract test |
| Missing durable state | One subscription per applicant/contact | migration 018 | seed and restart test |
| Missing contact choices | Active contacts only, deterministic labels | follower options datasource + migration 018 | datasource assertion and invalid-contact test |
| Missing workflow guards | actor, selection, applicant, company, operation, contact, notify, message | follower mutation guards | 403/404/422 focused assertions |
| Missing multi-record behavior | Add/remove selected applicants atomically | bulk mutation steps | multi-applicant mutation and idempotent replay |
| Missing visible result | Applicant detail shows follower summary | `api/applicant-detail.yaml`, `pages/applicant-detail.yaml` | detail query contract and reload assertion |
| Missing live visual proof | Odoo source action unavailable in reference | bsk blocker captures | exact blocker evidence; no parity claim |
