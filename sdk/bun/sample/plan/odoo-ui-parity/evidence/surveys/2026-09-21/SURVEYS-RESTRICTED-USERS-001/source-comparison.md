# `SURVEYS-RESTRICTED-USERS-001` source comparison

## Odoo source

- `addons/survey/models/survey_survey.py:65-69` defines the internal
  responsible user and `restrict_user_ids` many-to-many relation.
- `addons/survey/views/survey_survey_views.xml:63-70` renders the responsible
  user and restricted-user avatar tags on the Survey form.
- `addons/survey/security/survey_security.xml:38-47` filters Survey officer
  reads/writes to unrestricted surveys or surveys containing the current user.
- `addons/survey/models/survey_survey.py:446-459` validates that a restricted
  survey's responsible user retains access.

## Core3 implementation

- `20261020000000-053-survey-restricted-users.yaml` creates the durable
  `survey_restricted_users` relation and deterministic restricted survey
  fixture.
- `api/surveys.yaml` and `api/survey-detail.yaml` filter catalog/detail data
  server-side by `current_user_id`; the relation datasource applies the same
  boundary so direct queries cannot disclose restricted users.
- `pages/survey-detail.yaml` adds a separate `LineItemGrid` for the restricted
  user relation. Add/remove actions remain API-owned, require `surveys.write`,
  require an authenticated actor, and use parent/relation row versions.

This slice covers backend restricted-user visibility and relation lifecycle.
It does not claim Odoo's `res.users` picker/avatar rendering or responsible
user reassignment parity. Public token respondents remain governed by the
public survey contract, as in Odoo's separate backend security rule.
