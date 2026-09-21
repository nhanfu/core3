# Odoo source analysis

The Fleet addon manifest loads `wizard/fleet_vehicle_send_mail_views.xml` and
the Fleet vehicle view. The vehicle view binds `action_fleet_vehicle_send_mail`
to `fleet.vehicle` list and kanban views under the label `Mail to Driver`.
`fleet_vehicle.py::action_send_email` opens a modal form for
`fleet.vehicle.send.mail` with the selected vehicle IDs.

The transient wizard declares subject, HTML body, attachments, template, and
author. `action_send` checks every selected driver's email, renders the
optional template per vehicle, and posts a comment to each vehicle with the
driver as recipient. `action_save_as_template` creates a `mail.template`
targeting `fleet.vehicle` and attaches user-owned files.

The source access CSV grants the wizard to `fleet_group_manager` with read,
write, and create but no delete. The feature is therefore a manager-only
bulk action, not a Fleet-user vehicle detail action.

The requested live database was checked through the authenticated Odoo browser
session. Fleet was not present in the app launcher, and the direct Fleet route
returned to Discuss; consequently no live Fleet action ID or wizard screen
could be captured in `core3_reference`.
