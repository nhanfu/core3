# Functionality checklist

- [x] YAML page/API separation with matching `page.id`.
- [x] Public permission boundary is declared as `surveys.public`.
- [x] Attendee token is scoped to the requested session.
- [x] Answer is scoped to the host's current question.
- [x] Empty, invalid, closed, missing-attendee, and duplicate-answer states
      return explicit 409/404/422 contracts without mutation.
- [x] Durable answer, score, attendee row-version, and session counters.
- [x] Unique `(session_id, attendee_id, question_id)` replay boundary.
- [x] File-backed DuckDB restart and migration replay retain the answer.
- [x] Authenticated Core3 desktop/mobile rendered evidence is captured.
- [ ] Odoo attendee submission comparison: blocked by missing reference live
      session, with exact authenticated JSON evidence recorded.
