# Surveys public Multiple Choice QA inventory

Feature: `SURVEYS-PUBLIC-MULTIPLE-CHOICE-001`
Date: 2026-09-21

Required checks:

- Odoo `multiple_choice` is represented by a durable published Core3 fixture
  with a required question and token-scoped option metadata.
- The authenticated `page.id: surveys` page and `api.page: { id: surveys }`
  contract remain separate; public progress/submit retain `surveys.public`.
- Multiple selections render as checkbox controls, persist in answer data,
  and survive a file-backed restart.
- Duplicate and foreign options are rejected before mutation; an empty
  required submit is rejected; two concurrent submissions with one
  idempotency key converge on one response and one response-count increment;
  a wrong answer token returns 404.
- Core3 desktop and mobile probes are attempted and record exact runtime
  readiness/request blockers without claiming visual sign-off.
- Odoo desktop and mobile comparison is attempted and records exact login,
  installation, or proxy blockers without claiming parity sign-off.

Exploratory cases: duplicate selections, a foreign option, empty required
submit, concurrent duplicate submit, file-backed restart, and a stale answer
token.
