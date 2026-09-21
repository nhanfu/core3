# Odoo analysis

Source revision: `/home/nhanjs/projects/odoo` at `65975996`, addon
`addons/fleet`.

- `models/fleet_vehicle.py` defines `fleet.vehicle` with
  `mail.thread` and `mail.activity.mixin` inheritance.
- `views/fleet_vehicle_views.xml` defines the vehicle form and includes the
  native `<chatter/>` after the vehicle sheet.
- The chatter is the vehicle record's message/activity surface, where Odoo
  exposes file attachments with the mail composer/attachment controls.

The authenticated browser session on instance `245ea108` and database
`core3_reference` opened Discuss, but Fleet was absent from the launcher and
direct `/odoo/fleet` navigation returned to the non-Fleet shell. No live Fleet
attachment screen could therefore be inspected.
