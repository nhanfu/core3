# Gap matrix

| Gap ID | Odoo behavior | Existing Core3 gap | Change | Verification |
| --- | --- | --- | --- | --- |
| ATT-001 | Lead chatter attachments download from the authenticated record | CRM route was `/api/crm/attachments`; client route helper did not know the CRM kind | Align storage route with API-base convention and add `crm_lead_attachment` mapping | Contract/path and exact-byte route test |
| ATT-002 | Attachment read is record-scoped | Download query did not join the parent lead | Join `crm_lead_attachments` to `crm_leads` | Storage query assertion |
| ATT-003 | Invalid uploads are rejected before persistence | Only generic transport size protection existed | Add YAML name/size/missing-lead guards | 404/422 mutation tests |
| ATT-004 | Chatter attachment panel has durable rows | No deterministic CRM attachment row existed | Add migration `0.0.32` with inline base64 fixture | Migration replay/restart test |
| ATT-005 | Chatter supports empty/error/permission states | Attachment datasource had no declared response states | Add 401/403/503 error contracts | Datasource state assertions |
| ATT-006 | Desktop/mobile visual parity | No current authenticated comparison was available | Keep visual gate open; do not claim captures | Browser blocker in `verification.md` |
