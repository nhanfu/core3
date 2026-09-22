# Functionality checklist

- [x] Single-lead detail action is declared and permissioned.
- [x] Selected-lead bulk action is declared and permissioned.
- [x] Active template lookup has read permission and error states.
- [x] Missing selection, actor, lead, recipient, content, template, and lost-lead guards are explicit.
- [x] Single and bulk message rows persist with sender, recipient, content, template, state, and timestamp.
- [x] Each send records a `crm.email` activity for the lead timeline.
- [x] Migration replay and file-backed restart preserve templates, sent history, and activity records.
- [x] Attachment input is bounded to deterministic metadata (`attachment_name`).
- [ ] SMTP/provider delivery.
- [ ] Binary attachment upload and preview.
- [ ] Authenticated desktop/mobile browser evidence.
