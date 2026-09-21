# Odoo analysis

## Source-backed behavior

- `addons/crm/views/crm_lead_views.xml` renders `<chatter
  reload_on_post="True"/>` on the `crm.lead` form.
- `addons/crm/models/crm_lead.py` inherits `mail.thread` through the CRM lead
  model. `addons/mail/models/mail_thread.py` documents `message_post` support
  for inline attachments and existing attachment IDs, linking them to the
  record thread.
- The shared Odoo chatter attachment surface exposes file upload, an image
  preview viewer, and authenticated download. Non-image files use download;
  image files can be previewed before download.

## Bounded acceptance checklist

- Upload a non-empty file within the Core3 5 MB transport limit for an existing
  lead and persist name, MIME type, size, storage key, uploader, and audit row.
- Reject blank/overlong names, zero/oversized files, and missing leads without
  inserting metadata or an audit row.
- List attachment metadata from the CRM-owned datasource; expose empty,
  unauthorized, forbidden, and transport-error states.
- Download the exact authenticated bytes for a CRM attachment; reject an
  unknown/orphan attachment through the CRM lead join.
- Resolve image preview through the same protected download path and keep the
  panel responsive at desktop and mobile widths.
- Reapply migrations twice and reopen a file-backed database without losing
  the deterministic fixture or uploaded metadata.
