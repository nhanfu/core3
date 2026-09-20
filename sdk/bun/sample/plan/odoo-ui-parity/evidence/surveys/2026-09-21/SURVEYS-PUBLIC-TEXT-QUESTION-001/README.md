# `SURVEYS-PUBLIC-TEXT-QUESTION-001`

Bounded Wave 17 slice: Odoo-compatible public `text_box` / Core3 `Text`
multi-line response behavior.

The migration seeds a separate published Product Feedback Survey with one
required Text question. The paired `page.id: surveys` API/page contract keeps
the public mutation permissioned as `surveys.public`; arrays and missing
required text are rejected before mutation, while a scalar value containing a
newline persists through file-backed restart and concurrent idempotent submit.

Core3 runtime evidence is conditional. The Surveys runtime binding repair makes
the authenticated `/api/pages/surveys` probe return HTTP 200, but the isolated
browser topology then reports `Service host unavailable` before a rendered
authenticated public Text state can be captured. The anonymous public API also
returns HTTP 401 at the host boundary. `core3-runtime-{desktop,mobile}.png`
preserve the bounded runtime attempt; no browser sign-off is claimed.

Odoo comparison returned HTTP 200 but redirected to
`/web/login?redirect=%2Fodoo%2Fsurveys%3F`; port 8072 refused the connection.
No authenticated Odoo Text fixture or parity sign-off is claimed.
