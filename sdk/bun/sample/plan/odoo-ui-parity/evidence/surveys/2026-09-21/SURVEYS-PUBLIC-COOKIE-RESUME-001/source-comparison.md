# Source comparison

Odoo source: `addons/survey/controllers/main.py:survey_start`.

Odoo's public route is `auth='public'`. When no explicit `answer_token` is
provided it reads the `survey_<survey_token>` cookie, rechecks access data, and
discards a cookie that belongs to another user or a deleted/wrong answer. It
then resolves or creates the durable answer and sets the same cookie for 24
hours before redirecting to the survey page.

Core3 now applies the same precedence and stale-cookie boundary in
`services/surveys/module.ts`: an explicit query/body token wins; a valid cookie
resumes the token-scoped response; malformed or stale cookies fall through to
the normal public survey flow; an explicit stale token remains a 404. Start,
begin/replay, and submitted-response paths refresh the cookie with
`Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`.

The API action declares the optional `answer_token` while the authenticated
admin page remains a separate YAML fragment. Both fragments use
`page.id: surveys`; the public route is bound by the Surveys renderer and its
controller rather than by an admin-only page action.

The Odoo browser probe at `http://127.0.0.1:8069` returned HTTP 200 at both
1440x900 and 390x844 and redirected to the host-controlled
`/survey/<token>` waiting state (`Feedback Form`, `Pay attention to the host
screen until the next question`). The installed reference did not provide a
mutable participant answer fixture for proving a cookie-resumed question, so
no paired Odoo behavior sign-off is claimed.
