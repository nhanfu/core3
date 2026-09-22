# Odoo source analysis

- Source revision: `65975996` (local Odoo 19 source).
- Model: `event.registration` in
  `/home/nhanjs/projects/odoo/addons/event/models/event_registration.py`.
- Source method: `action_set_draft()` calls `write({'state': 'draft'})`.
- State mapping: `draft` is labelled `Unconfirmed`; `open` is `Registered`,
  `done` is `Attended`, and `cancel` is `Cancelled`.
- Form contract: `event_registration_views.xml` makes the state statusbar
  editable (`readonly="False"`) and clickable. The same form exposes
  Registered, Attended, Cancel Registration, and Send by Email actions.
- List contract: the registration list exposes state-aware Registered, Mark as
  Attending, and Cancel controls; reopening is available through the editable
  state workflow on the form.

The Core3 bounded action makes this source workflow explicit as a visible
`Reopen Registration` action for cancelled records while retaining the source
state transition and adding the required Core3 optimistic-concurrency guard.
