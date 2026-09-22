# Source comparison

| Odoo source behavior | Core3 bounded implementation |
| --- | --- |
| Survey kanban renders `Start Live Session` for an eligible active card and calls `action_start_session`. | Cards exposes stable `start_live_session_card` with `surveys.manage` and the same Draft/Published plus question-count visibility boundary. |
| `action_start_session` writes `session_state=ready`, sets the start time, clears the current question, and opens the session manager. | The page-matched API mutation writes the durable live-session row to `Ready`, clears current question/counters, increments `row_version`, and refreshes the Cards source. The existing detail/session-manager route remains the next navigation surface. |
| Odoo rejects actors outside the survey-user group and does not start an empty survey. | The action permission is `surveys.manage`; the mutation rejects missing actors, missing/non-startable surveys, and stale or already-active session rows. |

Evidence is limited to the source comparison and the bounded contract tests.
