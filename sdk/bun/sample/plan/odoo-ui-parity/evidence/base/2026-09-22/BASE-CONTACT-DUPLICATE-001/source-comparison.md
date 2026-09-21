# Source comparison

| Concern | Odoo 19 | Core3 implementation |
| --- | --- | --- |
| Entry point | Contact form Actions menu exposes Duplicate | `pages/contact-detail.yaml` exposes `duplicate_contact_ui` in `action_menu` |
| Naming | `res.partner.copy_data` appends ` (copy)` | API mutation derives `source.name || ' (copy)'` |
| Persistence | Duplicate is a new partner record | `base_contacts` insert plus copied `base_contact_categories_rel` rows |
| Access/state | Form action is available only on an editable contact | `base.contacts.write`, active/current-company, row-version, and duplicate-ID guards |
| Navigation | Duplicate opens the new editable contact | Client action calls the API and navigates to `/contacts/detail?id=<new-id>` |

The API and page YAML remain separate and are joined by the existing
`contact-detail` page identity. No Odoo frontend code was copied.
