# Source comparison

| Contract | Odoo 19 source | Core3 before | Core3 after |
| --- | --- | --- | --- |
| Reopen cancelled registration | `event.registration.action_set_draft` writes state `draft` | No reopen action; cancelled rows stayed terminal in Core3 UI | List/detail `Reopen registration` actions write `Unconfirmed` |
| Permission | Event users with write access through the form | Existing attendee mutations use `events.write` | Both reopen actions require `events.write` |
| Persistence | Odoo ORM state write | Durable `event_registrations.state` and `row_version` already existed | Same durable table; row version increments atomically |
| Concurrency | Odoo ORM write semantics | Existing Core3 mutations use expected row versions | Missing, stale, non-cancelled, and replay guards are explicit |
| Responsive UI | Editable form statusbar | Attendee list/detail states showed no reopen affordance | Explicit state-gated action is declared on both page surfaces |

Residual: live desktop/mobile Odoo and Core3 captures were not produced in this
checkpoint because the shared authenticated Odoo tab was borrowed by another
BrowserSkill session.
