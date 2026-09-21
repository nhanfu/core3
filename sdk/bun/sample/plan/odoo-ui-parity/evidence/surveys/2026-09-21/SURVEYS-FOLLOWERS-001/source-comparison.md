# SURVEYS-FOLLOWERS-001 source comparison

## Odoo source

- `survey.survey` inherits `mail.thread` in
  `/home/nhanjs/projects/odoo/addons/survey/models/survey_survey.py:23`.
- The Survey form includes Odoo's `<chatter/>` widget in
  `/home/nhanjs/projects/odoo/addons/survey/views/survey_survey_views.xml:199`.
- The inspected Survey model, views, and security files do not define a
  `company_id` boundary. This slice therefore does not invent company scope;
  it applies the source-backed authenticated actor and permission boundaries.

## Core3 implementation

- `services/surveys/migrations/20261024000000-060-survey-followers.yaml`
  creates durable `survey_followers` storage with a unique survey/user key.
- `services/surveys/migrations/20261024010000-061-survey-followers-demo.yaml`
  seeds one deterministic admin follower for `survey-demo-001`.
- `services/surveys/api/survey-detail.yaml` adds read-scoped follower and
  candidate datasources plus `surveys.write` add/remove mutations.
- `services/surveys/pages/survey-detail.yaml` binds those controls to the
  existing `survey-detail` page through explicit source/action IDs.

Both mutations require `surveys.write`, an authenticated actor, a non-archived
survey, and the current parent row version. Add rejects missing and duplicate
users; remove checks the current relation row version. Parent versions advance
on successful changes, so stale and concurrent replay cannot silently mutate
the relation. The follower row and candidate filtering survive file-backed
restart.

## Scope result

The slice covers the Odoo-backed follower lifecycle only. It does not claim
authenticated Core3 visual or paired Odoo parity because the required runtime
and reference services were unavailable during this run.
