# Surveys public answer validation

- Feature: `SURVEYS-PUBLIC-ANSWER-VALIDATION-001`
- Odoo source: `/survey/submit/<survey_token>/<answer_token>` delegates to
  question-level `validate_question`.
- Core3 contract: existing `surveys.public` YAML `progress` and `submit`
  actions, with validation in the Surveys public route before mutation.
- Covered types: Choice, Rating, Multiple Choice, and Numerical.
- Core3 evidence: authenticated Admin desktop/mobile invalid 422/no-mutation
  probes followed by valid rendered Question 1 → Question 2 progression.
- Odoo evidence: authenticated Feedback Form route returned HTTP 200 at both
  viewports but remained on the host-session waiting state; no invalid-answer
  mutation comparison is claimed.

Surveys remains `qa-in-progress / conditional`.
