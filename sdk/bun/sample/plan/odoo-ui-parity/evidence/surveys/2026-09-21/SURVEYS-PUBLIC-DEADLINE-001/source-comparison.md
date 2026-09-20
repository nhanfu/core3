# Source comparison

Odoo 19 `addons/survey/controllers/main.py` checks `answer_sudo.deadline` in
`_check_validity` and returns `answer_deadline` before allowing public survey
start, navigation, submission, or retry. The public print route separately
allows a completed response to render when that validity code is
`answer_deadline`.

Core3 implements the bounded non-print behavior with a nullable durable
`survey_responses.deadline` column, a deterministic expired response fixture,
deadline projection in public response operations, and HTTP 410
`SURVEY_PUBLIC_RESPONSE_EXPIRED` guards. Token and `surveys.public` permission
remain authoritative; expired requests are rejected before durable answer,
cursor, response-count, or retry changes.

`api/surveys.yaml` contains the public mutation contracts and `PublicSurvey.ts`
only binds the dynamic browser route to the API error payload. No disconnected
API was added.
