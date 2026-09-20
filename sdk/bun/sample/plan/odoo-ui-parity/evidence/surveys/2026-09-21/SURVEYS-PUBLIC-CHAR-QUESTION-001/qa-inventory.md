# Surveys public Char question QA inventory

Feature: `SURVEYS-PUBLIC-CHAR-QUESTION-001`
Date: 2026-09-21

Required claims and checks:

- Odoo `survey.question._validate_char_box` is represented by durable
  `validation_email`, validation-required, minimum/maximum length, and error
  message metadata.
- The `page.id: surveys` page and API remain separate; public question
  metadata carries the char rules and public mutations retain `surveys.public`.
- Invalid email and too-short values are rejected with no answer mutation; a
  valid address persists through a file-backed restart.
- Two concurrent submits with one idempotency key converge on one submitted
  response and one response-count increment; wrong answer tokens disclose no
  response data.
- The public renderer presents an email input with length attributes and the
  source validation message; authenticated Surveys desktop/mobile and public
  desktop/mobile states are captured at 1440x900 and 390x844.
- Paired Odoo desktop/mobile access is attempted and records exact login,
  installation, or proxy blockers without claiming parity sign-off.

Exploratory cases: malformed email, a boundary-length address, restart replay,
concurrent duplicate submit, and stale/wrong answer token.
