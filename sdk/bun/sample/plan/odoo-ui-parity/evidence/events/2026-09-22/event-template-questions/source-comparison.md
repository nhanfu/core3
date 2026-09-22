# Source comparison

Odoo 19 source:

- `/home/nhanjs/projects/odoo/addons/event/views/event_type_views.xml` declares
  the Event Template `Questions` notebook page and the `question_ids` field;
  its list shows title, mandatory, once-per-order, type, and answer choices.
- `/home/nhanjs/projects/odoo/addons/event/models/event_type.py` declares
  `question_ids = fields.Many2many('event.question', ...)` and defaults new
  templates to active default questions.

Core3 before this slice had the `Questions` tab in
`services/events/pages/event-template-detail.yaml`, but no content slot,
question datasource, durable template-question relation, or action. Existing
attendee question/answer and event question-link contracts were not reused as
template relations because they have different parent models and mutation
semantics.

Core3 after this slice:

- `event_template_questions` reads the durable template/question relation and
  projects the Odoo-visible fields from `event_questions`.
- `event_template_question_options` exposes unlinked reusable question choices.
- Add/remove mutations require `events.write`, preserve the shared question
  record, increment the template version, and guard duplicate/stale writes.
- The Questions tab owns the grid slot while the API remains separately owned
  and joined by `page.id: event-template-detail`.
