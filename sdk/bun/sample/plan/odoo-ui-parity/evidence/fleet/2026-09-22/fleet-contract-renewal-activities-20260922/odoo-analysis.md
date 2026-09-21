# Odoo analysis

Source revision: `/home/nhanjs/projects/odoo` at `65975996`, addon
`addons/fleet`.

- `models/fleet_vehicle_log_contract.py:9-12` defines
  `fleet.vehicle.log.contract` with `mail.thread` and `mail.activity.mixin`.
- `models/fleet_vehicle_log_contract.py:104-120` reschedules the renewal
  activity when expiration date or responsible user changes.
- `models/fleet_vehicle_log_contract.py:135-145` computes the renewal-alert
  window from `hr_fleet.delay_alert_contract` and finds nearly expired open
  contracts.
- `data/mail_activity_type_data.xml:4-8` registers
  `fleet.mail_act_fleet_contract_to_renew` for the contract model.
- `views/fleet_vehicle_cost_views.xml:3-63` includes the contract chatter.

The authenticated Odoo reference at `http://localhost:8069`, database
`core3_reference`, browser instance `245ea108`, rendered Discuss and its app
launcher contained no Fleet entry. Direct Fleet visual verification is blocked
and is not claimed.
