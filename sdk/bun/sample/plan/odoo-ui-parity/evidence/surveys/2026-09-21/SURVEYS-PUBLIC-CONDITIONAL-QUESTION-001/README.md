# `SURVEYS-PUBLIC-CONDITIONAL-QUESTION-001`

Bounded tenth-wave slice: Odoo-style public conditional question visibility.

The deterministic `SURVEY/BRANCHING` fixture exposes a root question, a
follow-up triggered by `Yes`, and an always-visible final question. Core3
stores the trigger relation durably, filters the public catalog and required
validation by the stored answer, skips hidden questions in both directions,
and inserts an API-returned conditional question into the renderer's sorted
question set. The page and API contracts remain separate and join through
`page.id: surveys`.

Focused service/restart/permission/concurrency evidence is in
`test-results.md`. Browser and reference observations are in
`browser-results.json`, `verification.md`, and `blockers.md`. This evidence is
conditional; it is not a module sign-off.
