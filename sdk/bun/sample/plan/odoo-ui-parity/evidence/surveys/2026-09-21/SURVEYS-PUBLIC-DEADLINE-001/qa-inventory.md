# QA inventory

| Surface | Check | Expected evidence | Status |
| --- | --- | --- | --- |
| Public API | Expired GET/progress/next/previous/submit/retry | HTTP 410, stable code, unchanged row | pass |
| Public API | Active response | Progress remains allowed | pass |
| Persistence | File-backed reopen | Deadline and answer data retained | pass |
| Idempotency | Expired retry and active start replay | No retry duplication | pass |
| Core3 desktop/mobile | Authenticated expired response page | Stable error and no overflow | blocked by runtime discovery |
| Odoo desktop/mobile | Paired deadline route | Source/reference comparison | not run; no sign-off |

Exploratory cases included expired navigation and expired retry, both checked
for unchanged durable state.
