# Odoo analysis

- Local source: `/home/nhanjs/projects/odoo/addons/crm/views/crm_lead_views.xml:324` renders `<chatter reload_on_post="True"/>` on the `crm.lead` form.
- Local mail source: `/home/nhanjs/projects/odoo/addons/mail/models/mail_thread.py` defines the durable `message_ids` history and `message_follower_ids` subscription contract for models inheriting `mail.thread`.
- Authenticated reference: `http://localhost:8069/odoo/crm`, browser instance `245ea108`, existing QA login session, CRM Pipeline and New opportunity form.
- Reference controls observed on the lead form: `Send message`, `Log note`, `Activity`, `Search Messages`, and `Attach files`; a new unsaved record shows `Creating a new record...` and disables attachments until persistence.
- Reference desktop viewport: `1916x833` in the connected browser; mobile emulation: `390x844`.
