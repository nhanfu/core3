# Source comparison

| Odoo capability | Core3 owner | Result |
| --- | --- | --- |
| Event form Questions notebook | services/events/pages/event-detail.yaml | Implemented |
| Reusable-question Add a line | event_detail_question_options and add_event_detail_question | Implemented |
| Sequence, mandatory, once-per-order, type, answers | event_detail_questions datasource and page columns | Implemented |
| Attendee answer stats | view_event_question_answers_from_event | Implemented |
| Remove linked question | remove_event_detail_question | Implemented |
| Page/API separation | matching event-detail ids | Verified |
| Durable event-question links | migration 20260922120000-035-event-question-links.yaml | Verified |
