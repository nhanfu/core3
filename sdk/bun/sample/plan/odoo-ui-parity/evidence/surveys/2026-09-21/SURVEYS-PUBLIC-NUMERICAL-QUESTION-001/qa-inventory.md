# Surveys public numerical question QA inventory

Feature: `SURVEYS-PUBLIC-NUMERICAL-QUESTION-001`
Date: 2026-09-21

Required claims and checks:

- Odoo `survey.question._validate_numerical_box` is represented by durable
  `validation_required`, minimum, maximum, and error-message metadata.
- The `page.id: surveys` page and API remain separate; the public question
  operation projects validation metadata and public mutations retain
  `surveys.public`.
- Values below, above, and outside numeric syntax are rejected with no answer
  mutation; a valid decimal persists through file-backed restart.
- Two concurrent submits with one idempotency key converge on one submitted
  response and one response-count increment.
- Wrong answer tokens disclose no response data.
- The public renderer presents a numeric input with the source range and
  client-side validation message; authenticated Surveys desktop/mobile and
  public desktop/mobile states are captured at 1440x900 and 390x844.
- Paired Odoo desktop/mobile access is attempted and records exact login,
  installation, or proxy blockers without claiming parity sign-off.

Exploratory cases: decimal boundary values `1.5` and `10.5`; malformed input,
stale/wrong answer token, replay after restart, and concurrent duplicate submit.
