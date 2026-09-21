# Odoo analysis

Local source inspection found:

- `addons/event/models/event_event.py`: `event.event` inherits both
  `mail.thread` and `mail.activity.mixin`.
- `addons/event/views/event_event_views.xml`: the event form renders
  `<chatter/>` and the activity-related view/action contracts.

Live authenticated observation on `Design Fair Los Angeles` confirmed the
Schedule Activity dialog contains `To-Do`, `Email`, `Call`, `Meeting`, and
`Document` choices plus `Summary`, `Due Date`, `Assigned to`, `Save`, `Mark
Done`, and `Discard`. At mobile emulation the same workflow is presented as a
full-height sheet at 390x844. These observations define the bounded parity
target; this batch does not claim all Odoo mail-thread behavior.
