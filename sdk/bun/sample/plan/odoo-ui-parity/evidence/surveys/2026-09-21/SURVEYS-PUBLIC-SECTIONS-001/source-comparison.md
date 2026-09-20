# Source comparison

Odoo source: `addons/survey/controllers/main.py:_prepare_question_html` and
`addons/survey/models/survey_survey.py:_get_survey_questions`.

Odoo keeps survey pages/sections in the same ordered question graph but marks
them with `is_page`; the public controller renders a page heading separately
and only treats non-page rows as answerable questions. Core3's deterministic
conditional fixture contains `section-conditional-profile` with
`is_page = true`, so including it in public cursor navigation was a concrete
parity gap.

Core3 now keeps the `surveys` page/API pair joined by `page.id`, retains
`surveys.public` on the public actions, and filters page rows from the public
question catalog and all durable first/current/next/previous cursor queries.
The token-scoped handler retries a concurrent losing next-question writer and
replays the navigation key. File-backed restart coverage verifies that the
cursor remains on an answerable question and never creates another response.

The installed Odoo probe could not reach the synthetic conditional token and
redirected to `/web/login?redirect=%2Fodoo%3F`; no authenticated paired Odoo
section comparison is claimed.
