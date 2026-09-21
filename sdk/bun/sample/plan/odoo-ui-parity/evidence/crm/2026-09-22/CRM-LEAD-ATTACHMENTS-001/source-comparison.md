# Source comparison

| Odoo 19 source behavior | Core3 before this slice | Core3 result |
| --- | --- | --- |
| Lead form includes generic `mail.thread` chatter with attachments | CRM had an attachment panel and table | Retained shared `OdooAttachmentPanel`; strengthened CRM contract and fixture |
| Attachment records are linked to the lead thread and downloadable | Upload metadata was written, but the storage route included `/api` while the client already prefixes `/api`; unknown kinds fell back to Chat | Storage route is `/crm/attachments`; client maps `crm_lead_attachment` explicitly |
| Attachment access follows record permissions | Storage query selected by attachment ID alone | Download query joins `crm_leads`; route requires `crm.attachment.download` |
| Chatter supports image preview and file download | Shared component had preview/download support but CRM could not resolve its route | CRM attachment kind resolves the protected route for both |
| Message post can link attachment IDs | Core3 uses a CRM-owned metadata table and activity log | Deliberate bounded YAML-first representation; no Odoo mail tables copied |

Reference UI was not mutated. Live authenticated tab borrowing was blocked by
the extension's required confirmation timeout, so this artifact contains source
comparison only and makes no visual-parity claim.
