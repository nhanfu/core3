# `SURVEYS-INVITE-ATTACHMENT-001` source comparison

## Odoo source

- `addons/survey/wizard/survey_invite.py:27-29` defines the invite wizard's
  `attachment_ids` many-to-many relation to `ir.attachment`.
- `addons/survey/wizard/survey_invite_views.xml:59-64` renders that field as a
  `many2many_binary` control beside the invitation deadline/template fields.
- `addons/survey/wizard/survey_invite.py:231-241` copies each selected
  attachment into the outgoing invite mail's `attachment_ids`.

## Core3 implementation

- `services/surveys/pages/invite-detail.yaml` is the layout-only authenticated
  invitation page; it binds `survey_invite_detail` and
  `survey_invite_attachments` through the attachment upload/download contract.
- `services/surveys/api/invite-detail.yaml` owns the read/upload/download
  actions. Uploads require `surveys.write`, an authenticated actor, a live
  non-archived survey invitation, the current invitation row version, and a
  non-empty file. Duplicate names are rejected before mutation.
- `20261019000000-052-survey-invite-attachments.yaml` creates the durable
  metadata ledger and deterministic certification-guide fixture. Uploaded
  bytes are stored through the shared attachment handler and survive restart.

This slice covers the invite attachment lifecycle and metadata/storage
boundary. It does not claim Odoo mail-server delivery or binary byte-for-byte
mail rendering parity.
