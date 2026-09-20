# Surveys public Text question QA inventory

Feature: `SURVEYS-PUBLIC-TEXT-QUESTION-001`
Date: 2026-09-21

Required checks:

- Odoo `text_box` is represented by a durable published Core3 fixture with a
  required multi-line question and token-scoped public metadata.
- The authenticated `page.id: surveys` page and `api.page: { id: surveys }`
  contract remain separate; public progress/submit retain `surveys.public`.
- A textarea is rendered with three rows at desktop and mobile, and its
  multi-line value is preserved in `answer_data` through restart.
- Array-shaped input and missing required text are rejected before mutation;
  two concurrent submissions with one idempotency key converge on one response
  and one response-count increment; a wrong answer token returns 404.
- Core3 authenticated admin/public desktop and mobile screenshots show the
  textarea without request/page failures or horizontal overflow.
- Odoo comparison is attempted for both viewports and records exact login,
  installation, or proxy blockers without claiming sign-off.

Exploratory cases: newline-containing text, array-shaped text input, empty
required submit, concurrent duplicate submit, file-backed restart, and a stale
answer token.
