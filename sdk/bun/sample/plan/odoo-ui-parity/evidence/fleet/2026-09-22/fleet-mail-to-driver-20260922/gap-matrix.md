# Gap matrix

| Gap | Evidence | Decision |
| --- | --- | --- |
| No prior Core3 Fleet mass-mail action | Existing Fleet API/page inventory had no `Mail to Driver` action or mail tables | Implemented as this bounded slice |
| No driver email persistence | `fleet_vehicles` stored driver name only | Added nullable `driver_email`, seeded only deterministic QA driver |
| No durable vehicle mail record | Odoo transient wizard had no Core3 counterpart | Added `fleet_vehicle_mail_messages` with Sent state and restart proof |
| No reusable Fleet mail template | No Fleet template lookup existed | Added active template storage and Save as new template mutation |
| Live Fleet visual surface unavailable | Launcher/direct-route blocker captures | Record blocker; do not claim visual parity |
