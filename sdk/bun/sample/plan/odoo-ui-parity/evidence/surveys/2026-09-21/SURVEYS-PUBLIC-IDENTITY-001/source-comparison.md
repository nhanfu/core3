# Source comparison

Odoo 19 source at `/home/nhanjs/projects/odoo`, revision `65975996`:

- `addons/survey/models/survey_question.py:110-115` defines stored
  `save_as_email` and `save_as_nickname` flags.
- `survey_question.py:315-325` limits the flags to the source char-box
  question semantics.
- `addons/survey/models/survey_user_input.py:294-299` writes an answer to the
  participant email or nickname while still saving the answer line.
- `addons/survey/views/survey_question_views.xml:153-155` exposes the two
  options in the question form.

Core3 maps the source flags to durable `survey_questions` columns in migration
`20260929000000-032-survey-public-identity.yaml`, exposes them through the
`survey.public.identity_settings` operation, and merges them into the
`page.id: surveys` public API/page pair. `module.ts` derives respondent fields
on both progress and submit, while the renderer uses email/nickname browser
autocomplete controls. The original `answer_data` remains authoritative and
the token/state guards remain in the existing `surveys.public` actions.

The deterministic `Contact Details` fixture uses the published token
`identity-public-token-2026` with one email-capture and one nickname-capture
question. This is a Core3 source comparison, not an Odoo visual sign-off.
