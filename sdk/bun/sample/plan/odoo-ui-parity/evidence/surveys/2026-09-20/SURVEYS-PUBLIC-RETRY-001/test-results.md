# Verification

- Focused feature test: **3 passed, 0 failed, 24 assertions** in
  `test/surveys_public_retry.integration.test.ts`.
- The test covers YAML/API separation, public permission, durable retry
  insertion, respondent context, idempotent replay, file-backed restart,
  progress/submit continuation, wrong-state, closed, wrong-token, and method
  guards.
- Browser Core3 evidence: desktop/mobile authenticated contexts passed with
  zero failed requests and no horizontal overflow.
- Odoo browser evidence: desktop/mobile authenticated contexts reached the
  retry route with HTTP 200 and the exact access-error blocker recorded in
  `odoo-browser-results.json`.
