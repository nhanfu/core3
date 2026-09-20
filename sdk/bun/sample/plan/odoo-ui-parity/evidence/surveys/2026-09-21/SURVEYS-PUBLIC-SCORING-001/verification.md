# Verification

The implementation was verified against deterministic Feedback Form fixtures.
Correct answers persisted `{ score: 100, quiz_passed: true }`; incorrect
answers persisted `{ score: 0, quiz_passed: false }`. A file-backed DuckDB
reopen returned the submitted result unchanged. Two concurrent submissions
with one idempotency key converged on one row and replayed the committed result
after the observed DuckDB losing-writer conflict.

The Surveys-owned `PublicSurvey` renderer now consumes the submit response and
renders `Score: <percentage>% · Passed/Not passed`; a submitted resume also
uses the persisted result. The renderer contract is covered by the focused
source/contract assertions.

Authenticated Core3 login as `admin@tms.local` succeeded in both viewports and
`/api/auth/me` returned 200. The authenticated public API returned 404
`API route not found`, while the rendered public route returned 401
`Unauthorized`. Odoo returned a login redirect for the public token in both
viewports. No browser-rendered score/pass comparison or Odoo sign-off is
claimed.
