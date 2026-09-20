# QA inventory — SURVEYS-QUESTION-CREATE-001

## Claims under test

- An authenticated Survey Manager can add an ordered question from the
  survey-detail Questions grid.
- The action is `surveys.write` protected, durable, parent-scoped, and safe on
  stale or archived surveys.
- The rendered control works at 1440x1000 and 390x844 without document
  overflow.
- The Odoo source control is identified, while the current authenticated Odoo
  database is recorded as an uninstalled-Surveys fallback.

## Controls and states

- Before: Feedback Form with seven deterministic questions.
- Form: Add a question inline row with save/cancel controls.
- After: appended question with sequence 8 (desktop) and sequence 9 (mobile
  follow-up in the isolated in-memory browser process).
- API: valid create, blank title 422, stale parent 409, archived parent 409.
- Persistence: file-backed DuckDB close/reopen retains the created question.

## Exploratory cases

1. Click Add a question, enter a title, save, reload the detail route, and
   confirm the appended row remains visible.
2. Repeat at mobile width and inspect the page metrics; confirm the control and
   row remain reachable without horizontal overflow.

The screenshots in this directory are the bounded feature evidence. They do
not sign off the broader Surveys module.
