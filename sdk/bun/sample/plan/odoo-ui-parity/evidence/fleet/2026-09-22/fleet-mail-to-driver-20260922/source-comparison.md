# Source comparison

| Odoo contract | Core3 contract | Result |
| --- | --- | --- |
| `Mail to Driver` bound to vehicle list/kanban | Selectable Fleet vehicle list with manager-only `mail_fleet_vehicle_drivers` bulk action | Implemented |
| `fleet.vehicle.send.mail` modal | `server_form`, `modal_style: mail_composer`, Subject, Message, Load template | Implemented |
| Driver email required for every selected vehicle | `driver_email` migration field and `FLEET_MAIL_DRIVER_EMAIL_REQUIRED` guard | Implemented |
| `action_send` posts one message per vehicle | `fleet_vehicle_mail_messages`, one durable `Sent` row per selected vehicle | Implemented |
| `action_save_as_template` creates Fleet template | `save_fleet_vehicle_mail_template` plus `fleet_vehicle_mail_templates` | Implemented |
| Attachments and template-rendered per-vehicle interpolation | Not in this bounded slice; no fake attachment claim | Deferred |
| Live Fleet desktop/mobile UI | No Fleet menu/action in `core3_reference` | Blocked by reference database |

Page presentation remains in `pages/vehicles.yaml`; datasources and mutations
remain in `api/vehicles.yaml`, joined by `page.id: vehicles`.
