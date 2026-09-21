# Odoo source analysis

- Addon/source: Odoo 19 `event`, revision `65975996`.
- Model: `event.registration.answer` in
  `/home/nhanjs/projects/odoo/addons/event/models/event_registration_answer.py`.
- Fields: `question_id`, `question_type`, `value_answer_id`, and
  `value_text_box`; registration and event relations are server-owned.
- Form: `event_registration_views.xml` renders the `Questions` notebook page
  with `registration_answer_ids`, editable list columns Question, Type,
  Suggested answer, and Text answer, plus `Add a line`.
- Mobile: the source kanban projection retains Question, Suggested answer, and
  Text answer and sets create/delete false.
- Live menu path: Events > Reporting > Attendees. The authenticated Samar
  Basra form exposed the Questions table and Add a line control.
