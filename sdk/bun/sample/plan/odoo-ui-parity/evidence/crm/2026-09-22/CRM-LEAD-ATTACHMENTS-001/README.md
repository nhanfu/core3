# CRM-LEAD-ATTACHMENTS-001

Bounded source-backed evidence for the Odoo CRM lead-detail chatter
attachment lifecycle.

- Date: 2026-09-22
- Owner: CRM module owner
- Odoo source: `/home/nhanjs/projects/odoo/addons/crm`
- Core3 page/API: `lead-detail` / `services/crm/pages/lead-detail.yaml` and
  `services/crm/api/lead-detail.yaml`
- Core3 attachment kind/route: `crm_lead_attachment` / `/crm/attachments`
  under the authenticated API base
- Permissions: `crm.write` for upload; `crm.read` and
  `crm.attachment.download` for read/download
- Status: conditional bounded implementation; no module sign-off

No password, cookie, token, or screenshot is stored here. The required visual
captures are explicitly omitted because the authenticated tab borrow timed out;
see `verification.md`.
