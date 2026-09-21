# Odoo analysis

Local source inspection found:

- `addons/event/models/event_event.py`: `event.event` inherits
  `mail.thread` and `mail.activity.mixin`.
- `addons/event/views/event_event_views.xml`: the event form renders
  `<chatter/>` after the sheet.

Authenticated observation of `Design Fair Los Angeles` through the Events menu
confirmed the desktop and mobile chatter controls `Send message`, `Log note`,
`Activity`, `Search Messages`, `Attach files`, and a follower count. Opening
Send message showed the Followers only recipient selector, message composer,
Send action, canned response, attachment, and full-composer controls. The
stream contained the system notification `Event created`.
