# SURVEYS-CHATTER-NOTE-001 source comparison

Date: 2026-09-21

## Odoo source

- `addons/survey/models/survey_survey.py:23` inherits `mail.thread`.
- `addons/survey/views/survey_survey_views.xml:199` renders the Survey form `<chatter/>` widget.

## Core3 implementation

- Migrations `0.0.58` and `0.0.59` add `survey_messages` with a deterministic internal-note fixture.
- The existing authenticated `survey-detail` API datasource combines durable activity and note entries for the OdooFormView chatter stream.
- `log_survey_note` is a separate `surveys.write` action bound through `page.id: survey-detail`; it requires an authenticated actor, non-archived survey, current parent row version, and 1–4000 characters.
- The parent version increments after the note insert, making stale/replayed requests fail before a second note is created; file-backed restart preserves the note.

This slice covers internal authenticated notes only. It does not claim Odoo mail delivery, follower subscriptions, external messages, or full chatter byte parity.
