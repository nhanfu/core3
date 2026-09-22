# Source comparison

Odoo 19 source:

- `addons/event/models/event_type.py` declares `tag_ids = fields.Many2many('event.tag', string="Tags")`.
- `addons/event/views/event_type_views.xml` renders `tag_ids` with the
  `many2many_tags` widget and the event-tag color field.

Core3 mapping:

- `pages/event-template-detail.yaml` owns the Tags presentation and action
  controls.
- `api/event-template-detail.yaml` owns `event_template_tags`, scoped tag
  options, and permissioned mutations; both remain joined by
  `page.id: event-template-detail`.
- Migration `20260922240000-042-event-template-tags.yaml` persists the
  many-to-many relation and seeds stable Exhibition links for Music and
  Conference.

Bounded residual: Core3 uses the shared Odoo-shaped line grid for the
template-owned relation; it does not add tag creation from the many-to-many
selector, matching Odoo's `no_quick_create` option.
