# Odoo analysis

Local source: `/home/nhanjs/projects/odoo/addons/hr_recruitment` at
`659759969d535d286b656c96b675e4612b925ddd`.

`views/hr_applicant_views.xml` binds server action
`mail_followers_edit_action_from_hr_recruitment` to `hr.applicant` list and
kanban views (`binding_view_types=list,kanban`). It opens transient model
`mail.followers.edit` as a modal with `default_res_model=hr.applicant` and the
selected applicant ids. The source form is titled `Add/Remove Followers` and
contains a horizontal Add/Remove radio, a required `Followers` many-to-many
contact selector with `Add contacts` placeholder, `Notify Recipients` (hidden
for Remove), optional `Extra Comments ...` (shown for Add + Notify),
`Update Followers`, and `Discard`.

`addons/mail/wizard/mail_followers_edit.py` applies `message_subscribe` or
`message_unsubscribe` to all selected documents. Add is idempotent; Remove is
idempotent. Notify posts an invitation message after Add and requires a signed
in sender email. Empty selected documents are rejected. The source model has
ordinary-user read/create/write access and no delete access; Recruitment maps
the bound mutation to `recruitment.write`.

Live authenticated check: browser instance `245ea108`, database
`core3_reference`, requested URL `http://localhost:8069/odoo/recruitment?db=core3_reference`.
The launcher exposed Discuss, Calendar, To-do, Contacts, CRM, Sales,
Dashboards, Point of Sale, Invoicing, Project, Timesheets, Events, Surveys,
Purchase, Inventory, Maintenance, Employees, and Expenses, but no Recruitment.
The direct URL returned Discuss/OdooBot. The live form and records were not
available; this is an environment blocker, not evidence that the source action
is absent.
