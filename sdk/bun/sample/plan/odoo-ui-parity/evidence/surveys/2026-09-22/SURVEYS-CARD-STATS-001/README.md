# SURVEYS-CARD-STATS-001

## Bounded slice

Implemented the next uncovered stable-ID Odoo Survey kanban behavior after
the card Color action: Registered, Completed, and Certified counters open the
participant list with the corresponding survey/status cohort.

Source comparison:

- `/home/nhanjs/projects/odoo/addons/survey/models/survey_survey.py:1108-1134`
  defines the three participant actions and their default filters.
- `/home/nhanjs/projects/odoo/addons/survey/views/survey_survey_views.xml:268-296`
  renders the card counters as clickable actions.
- Core3 keeps the page/API split in `pages/surveys.yaml` and `api/surveys.yaml`.
  Counts are derived from durable `survey_participants` rows; no migration is
  needed.

## Verification

- Focused test: `test/surveys_card_stats.integration.test.ts`.
- BrowserSkill session was started against browser instance `245ea108` and an
  explicit borrow was requested for the authenticated Odoo tab. The tab was
  already owned by another session; no Odoo navigation or visual-parity claim
  is made.
- The session is stopped after the borrow attempt and any borrowed tab is
  returned by BrowserSkill cleanup.

## Remaining gaps

This slice does not implement Odoo's full kanban rendering, action-window
metadata, or additional public/live-session flows. Surveys remains in
progress.
