# Surveys public previous-question navigation

- Feature: `SURVEYS-PUBLIC-PREVIOUS-QUESTION-001`
- Source: Odoo `addons/survey/controllers/main.py:583-587`, where
  `previous_page_id` selects the prior survey page/question.
- Core3: separate YAML operation/API action plus the Surveys-owned public
  renderer Back binding.
- Core3 evidence: authenticated Admin desktop/mobile at 1440x900 and 390x844;
  Question 2 → Back → Question 1, reload restoration, and idempotent replay.
- Odoo blocker: the installed reference at `http://127.0.0.1:8069` has no
  stable active answer-token fixture accepted for a fresh mutation probe.
  Therefore no paired Odoo mutation/visual sign-off is claimed.

This is a bounded Core3 pass; Surveys remains `qa-in-progress / conditional`.
