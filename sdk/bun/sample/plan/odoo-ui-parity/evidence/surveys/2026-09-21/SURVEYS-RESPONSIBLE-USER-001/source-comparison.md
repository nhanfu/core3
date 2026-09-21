# SURVEYS-RESPONSIBLE-USER-001 source comparison

Date: 2026-09-21

## Odoo source

- `addons/survey/models/survey_survey.py:65-68` defines `survey.survey.user_id` as the internal `res.users` Responsible many2one, defaulting to the current user.
- `addons/survey/views/survey_survey_views.xml:63-70` renders `user_id` as `many2one_avatar_user`, separately from `restrict_user_ids` rendered as avatar tags.
- `addons/survey/models/survey_survey.py:446-459` constrains a restricted survey so its responsible officer retains access.

## Core3 implementation

- Migration `0.0.54` adds durable `surveys.responsible_user_id` and `surveys.responsible_user_name`; data migration `0.0.55` gives existing fixtures deterministic display names.
- `api/surveys.yaml` and `api/survey-detail.yaml` project both responsible fields through the authenticated catalog/detail API pair.
- `pages/surveys.yaml` and `pages/survey-detail.yaml` expose the responsible user in list/form presentation and bind `update_survey_responsible_user` to the API action.
- The mutation requires `surveys.write`, a non-empty authenticated actor, optimistic `row_version`, non-archived state, non-empty user fields, and membership in `survey_restricted_users` when the survey is restricted.

This is an internal authenticated responsible-user assignment slice. It does not replace or duplicate the restricted-user relation, public respondent token behavior, or Odoo's avatar widget byte-for-byte.
