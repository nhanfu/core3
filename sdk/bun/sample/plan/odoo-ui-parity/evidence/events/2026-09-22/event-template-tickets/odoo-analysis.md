# Odoo analysis

Local source: `/home/nhanjs/projects/odoo`, Odoo 19 revision `65975996`.

The source action is `action_event_type` in
`addons/event/views/event_type_views.xml`. Its Event Template form renders a
Tickets notebook page containing `event_type_ticket_ids`. The relation uses
`event_type_ticket_view_tree_from_type` and
`event_type_ticket_view_form_from_type` from
`addons/event/views/event_ticket_views.xml`.

The bounded visible contract is:

- editable relation rows with sequence/order, name, description, and maximum
  attendees;
- derived `Limit Attendees` state from the maximum;
- add, edit, and delete relation rows under the template;
- reusable-template scope and Event Manager write access.

BrowserSkill blocker: daemon status was healthy on shared browser instance
`245ea108`, but `bsk tab borrow 1770662590 --session krcu --timeout 120s`
timed out without extension confirmation. The Odoo tab remained user-scoped.
No credentials, cookies, or independent login were used.
