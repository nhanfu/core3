# `SURVEYS-PUBLIC-COMMENTS-001`

Bounded eleventh-wave slice: Odoo-style comments on a choice question.

The deterministic `SURVEY/COMMENTS` fixture exposes a required Choice with
`comments_allowed`, `comments_message`, and `comment_count_as_answer`. Core3
returns those settings through a separate API operation joined to the
`page.id: surveys` page contract, renders the comment field, persists the
question-scoped `<question_id>__comment` value in durable `answer_data`, and
allows a comment-only answer to satisfy the required choice when configured.

Focused lifecycle and permission evidence is in `test-results.md`. Browser
and Odoo observations are in `browser-results.json`, `verification.md`, and
`blockers.md`. This remains conditional evidence, not module sign-off.
