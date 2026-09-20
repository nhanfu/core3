# Verification

Core3 authenticated probes used an isolated single-Surveys runtime on
`127.0.0.1:4017` and Admin credentials. Desktop 1440x900 and mobile 390x844
both loaded Feedback Form, showed seven questions and `Entry state: New`,
clicked `Start Test`, and reached `/survey/start/...?...test=1` with the exact
`This is a Test Survey Entry` state. Document/body widths matched the viewport
at both sizes. One navigation-aborted `/api/v1/companies` request occurred
while leaving the shell; no HTTP API response failure occurred.

Authenticated Odoo `127.0.0.1:8069` with the installed reference session
returned HTTP 200 at `/survey/test/b135640d-14d4-4748-9ef6-344ca256531e`,
redirected to `/survey/<token>`, and rendered `This is a Test Survey Entry`
and `Pay attention to the host screen until the next question.` at desktop
and mobile. Widths matched the viewport and no request failures occurred.

This feature has a paired Odoo comparison; no Odoo blocker is claimed. The
overall Surveys module remains `qa-in-progress / conditional` because other
module-wide parity cases remain open.
