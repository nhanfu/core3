# Source comparison

| Source contract | Core3 contract | Result |
| --- | --- | --- |
| Applicant list/kanban `Send Email` action | `pages/applicants.yaml` selectable bulk action joined to `api/applicants.yaml` by `page.id` | implemented |
| Modal subject/body/template/attachment controls | YAML `server_form`, `mail_body`, `mail_attachment`, and template datasource | implemented |
| Selected applicant IDs | `for_each selectedIds` mutation creates one row per applicant | implemented |
| Missing applicant email is rejected | `RECRUITMENT_MAIL_EMAIL_REQUIRED` guard | implemented |
| Invalid actor/company/template/content is rejected | explicit YAML guards with no-partial-write test coverage | implemented |
| Odoo transient composer/message post | durable `recruitment_applicant_mail_messages` audit table | bounded adaptation |
| SMTP/external mail queue and full chatter | not included in this bounded slice | explicit gap |

Local source was used for the product contract. The live authenticated
reference was unavailable for Recruitment, so no visual equivalence is
asserted.
