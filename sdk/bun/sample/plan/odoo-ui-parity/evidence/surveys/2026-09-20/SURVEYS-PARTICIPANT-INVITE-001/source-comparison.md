# SURVEYS-PARTICIPANT-INVITE-001 source comparison

Date: 2026-09-20

## Odoo source

- `addons/survey/views/survey_user_views.xml:40-42` exposes **Resend
  Invitation** when a participant is not done and has a partner/email. The
  print action is restricted to completed participants.
- `addons/survey/models/survey_user_input.py:180-193` implements
  `action_resend`, passing `default_existing_mode=resend` and participant
  partner/email values to the invitation composer.
- `addons/survey/security/ir.model.access.csv:23` grants access to the survey
  invite model.

## Core3 implementation

`services/surveys/pages/participants.yaml` remains the page contract and
`services/surveys/api/participants.yaml` remains the API/action contract.
`send_survey_invitation` accepts a New participant; `resend_survey_invitation`
accepts an In Progress participant. Both require `surveys.write`, persist
invitation count/state/sent-at values, and use deterministic timestamps for
repeatable fixtures. Explicit error codes cover invalid state, missing email,
and stale replay. The integration suite also reopens a file-backed DuckDB
database to verify durable state.

No mail transport or external delivery claim is made: this slice verifies the
participant invitation lifecycle and durable action state.

## Live Odoo comparison limitation

The fresh authenticated probe at `/odoo/action-241` confirmed that Surveys is
installed in `core3_reference`, correcting the older uninstall note in prior
ledgers. The Participants action currently contains only Completed fixtures
(Let’s connect!, MyCompany Vendor Certification, and Feedback Form groups).
There is no New or In Progress row to expose Odoo's resend action or perform a
paired live mutation. `odoo-participants-desktop.png` and
`odoo-participants-mobile.png` are the exact desktop/mobile comparison
captures; no paired Odoo mutation sign-off is claimed.
