# SURVEYS-PUBLIC-NEXT-QUESTION-002

Bounded repair for the disconnected public next-question renderer.

Ownership trace: `public/app.ts:312-325` mounts
`public/components/PublicSurvey.ts` for `/survey/start/...`; the renderer has
Surveys-only history and is included as the owned binding path in this commit.
It now consumes `current_question_id`, saves progress, calls the durable
`next_question` API, renders the returned question, and restores it after
reload.

`core3-browser-results.json` and the four screenshots contain authenticated
Admin desktop/mobile evidence. Odoo source and the exact active-answer-token
fixture blocker are recorded in `source-comparison.md`,
`odoo-browser-results.json`, and `verification.md`.
