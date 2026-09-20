# Source comparison — `SURVEYS-PUBLIC-CHAR-QUESTION-001`

Odoo source `addons/survey/models/survey_question.py:109-153` defines the
char-box validation flags: `validation_email`, `validation_length_min`, and
`validation_length_max`. `_validate_char_box` at lines 486-498 rejects an
invalid normalized email when enabled and enforces the inclusive configured
length range before the answer line is saved.

Core3 migration `20261004000000-037-survey-public-char-question.yaml` adds the
durable char validation columns and seeds a separate published `Contact Email
Survey`. The existing `page.id: surveys` page/API pair projects those fields
through `survey.public.questions`; token-scoped `surveys.public` progress and
submit validate them before mutation. The renderer binds the same metadata to
an email input with minlength/maxlength attributes and the persisted error
message.

This slice covers public char-box email and length semantics only. It does not
claim Odoo's authenticated question editor, participant identity capture, or
other question types.
