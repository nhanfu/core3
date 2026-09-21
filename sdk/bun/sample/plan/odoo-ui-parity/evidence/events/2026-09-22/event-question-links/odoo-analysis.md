# Odoo source and live analysis

Local Odoo 19 source:

- addons/event/models/event_event.py declares question_ids as the stored
  event-to-question relation.
- addons/event/models/event_question.py declares reusable question fields,
  answer choices, mandatory and once-per-order settings, and the attendee
  answer action.
- addons/event/views/event_event_views.xml renders the Questions notebook
  list with add context, sequence, title, mandatory, once-per-order, type,
  answer choices, and action_view_question_answers.

The authenticated reference was reached through the Events menu as the shared
QA login in database core3_reference. Design Fair Los Angeles showed Name,
Email, and Phone rows, Add a line, row deletion, and the Questions table at
1916x833 and 390x844. The Add a line dialog was inspected without creating a
reference-side record.
