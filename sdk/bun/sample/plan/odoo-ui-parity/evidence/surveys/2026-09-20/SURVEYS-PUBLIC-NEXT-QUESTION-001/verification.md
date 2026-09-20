# Verification and blockers

Core3's public endpoint was exercised in an isolated Surveys runtime at
`http://127.0.0.1:4017` using deterministic Feedback Form data. Desktop
1440x900 and mobile 390x844 both returned HTTP 200 from start and
`/next_question`; the response cursor and returned question were
`question-feedback-comment`. The browser recorded zero failed requests and
body/document widths equal to each viewport. The runtime was stopped after
the probe.

The API result is durable and idempotent, but after reloading the public HTML
page the existing `public/components/PublicSurvey.ts` still displays its
client-side Question 1. That renderer is not within the allowed
`services/surveys/**`, `test/surveys*.ts`, or Surveys plan/QA/evidence paths,
so it was not altered in this bounded commit. This is the exact remaining UI
integration blocker.

Odoo source comparison is complete against
`/home/nhanjs/projects/odoo/addons/survey/controllers/main.py:537-611`.
The installed reference at `http://127.0.0.1:8069` was not used for a fresh
mutation capture because the available reference data has no stable active
in-progress answer-token fixture for `/survey/next_question`; consequently no
paired Odoo visual/mutation sign-off is claimed.
