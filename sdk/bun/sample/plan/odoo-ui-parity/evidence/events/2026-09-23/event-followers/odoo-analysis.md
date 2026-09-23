# Odoo analysis

Local source inspection found:

- `addons/event/models/event_event.py`: `event.event` inherits
  `mail.thread` and `mail.activity.mixin`.
- `addons/event/views/event_event_views.xml:163`: the event form renders
  `<chatter/>` after the sheet.

BrowserSkill observation of `Design Fair Los Angeles` showed the desktop and
mobile chatter controls `Send message`, `Log note`, `Activity`, `Search
Messages`, `Attach files`, and a follower count. Opening the follower menu
showed `Follow`, `Add Followers`, and `Marc Demo Edit subscription Remove this
follower`. The stream retained the seeded `Event created` notification.
