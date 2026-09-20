# `SURVEYS-PUBLIC-CHAR-QUESTION-001`

Bounded Wave 16 slice: Odoo-compatible public Char/Char Box email and inclusive
length validation.

Core3 evidence covers the authenticated Surveys admin and token-scoped public
survey at desktop (`1440x900`) and mobile (`390x844`). The public control is an
email input with `minlength=6`, `maxlength=80`, and the seeded validation copy;
the invalid-address probe shows client rejection without a request failure.
The durable test covers invalid no-mutation, valid persistence across a
file-backed restart, concurrent idempotent submit, response counting, and wrong
answer-token denial.

Odoo comparison was attempted at `/odoo/surveys` for both viewports. Both
requests redirected to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; the reference
proxy on port 8072 refused the connection. There is no authenticated Odoo
fixture, so this evidence is conditional and does not claim parity sign-off.
