# Odoo source and live analysis

Local Odoo 19 source:

- `/home/nhanjs/projects/odoo/addons/event/models/event_event.py` declares
  `badge_format` as a required selection, `badge_image` as an image field,
  and stored editable HTML fields `ticket_instructions` and `note`.
- `/home/nhanjs/projects/odoo/addons/event/views/event_event_views.xml` adds
  the `Notes & Documents` page with Badge Dimension, Badge Background, Ticket
  Instructions, and Note.

Live reference navigation used the authenticated Events menu, opened the
`Design Fair Los Angeles` event, and selected `Notes & Documents`. Desktop
showed Badge Dimension `A6`, badge upload, ticket instructions, and the
internal-note placeholder. The same field group was visible at 390x844 mobile
width. The evidence uses browser instance `245ea108`; credentials and session
material are intentionally omitted.
