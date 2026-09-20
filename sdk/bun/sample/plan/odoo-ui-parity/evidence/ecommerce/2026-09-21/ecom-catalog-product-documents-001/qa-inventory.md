# QA inventory

| Claim/control | Functional check | Visual check/evidence |
| --- | --- | --- |
| Product documents list is persisted and company-scoped | Seed/replay and source query test | Core3 desktop/mobile blocked by unavailable runtime |
| New document metadata can be created | Product Detail create mutation test | Product Detail form capture blocked |
| Binary upload and replacement are durable | Multipart upload, exact download bytes, restart test | Document detail attachment panel capture blocked |
| Publish on Product Page toggle works | Permissioned edit mutation and row-version test | Published/archived visual state not captured |
| Delete and stale replay are safe | Delete and 409 stale tests | Delete confirmation state not captured |
| Download permission and active-product boundary | Storage contract plus authenticated download test | Odoo comparison blocked by `/shop` 404 |

Exploratory/negative cases included wrong-company upload/edit/delete context,
zero-byte upload, and stale replacement/edit requests. The available evidence
supports service/API and persistence claims only; it does not sign off visual
layout, mobile fit, or authenticated actor rendering.
